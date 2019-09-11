// Copyright 2015, Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @name Negative Keyword Conflicts - Manager Accounts
 *
 * @overview The Negative Keyword Conflicts script generates a spreadsheet
 *     and email alert if an AdWords account has positive keywords which are
 *     blocked by negative keywords. See
 *     https://developers.google.com/adwords/scripts/docs/solutions/mccapp-negative-keyword-conflicts
 *     for more details.
 *
 * @author AdWords Scripts Team [adwords-scripts@googlegroups.com]
 *
 * @version 1.3.2
 *
 * @changelog
 * - version 1.3.2
 *   - Added validation for external spreadsheet setup.
 * - version 1.3.1
 *   - Fix bug where campaigns with multiple shared negative keyword lists were
 *     not handled correctly.
 * - version 1.3.0
 *   - Fix bug where in certain cases phrase match negatives were incorrectly
 *     reported as blocking positive keywords.
 * - version 1.2.1
 *   - Improvements to time zone handling.
 * - version 1.2
 *   - Improved compatibility with Large Manager Hierarchy template.
 *   - Add option for reusing the spreadsheet or making a copy.
 * - version 1.1
 *   - Bug fixes.
 * - version 1.0
 *   - Released initial version.
 */

var CONFIG = {
  // URL of the spreadsheet template.
  // This should be a copy of https://goo.gl/rQ9Jqs.
  SPREADSHEET_URL: 'https://docs.google.com/spreadsheets/d/1BGSP0CiCXMYe_euVLMXH_g2klLc3hr9tkKrWnDJsGL0/edit#gid=0',

  // Whether to output results to a copy of the above spreadsheet (true) or to
  // the spreadsheet directly, overwriting previous results (false).
  COPY_SPREADSHEET: false,

  // Array of addresses to be alerted via email if conflicts are found.
  RECIPIENT_EMAILS: [
    'christoph.geypen@groupepvcp.com'
  ],

  // Label on the accounts to be processed.
  // Leave blank to include all accounts.
  ACCOUNT_LABEL: 'BE',

  // Label on the campaigns to be processed.
  // Leave blank to include all campaigns.
  CAMPAIGN_LABEL: '',

  // Limits on the number of keywords in an account the script can process.
  MAX_POSITIVES: 250000,
  MAX_NEGATIVES: 50000
};

/**
 * Configuration to be used for running reports.
 */
var REPORTING_OPTIONS = {
  // Comment out the following line to default to the latest reporting version.
  //apiVersion: 'v201605'
};

function main() {
  validateConfig();
  var accountSelector = MccApp.accounts();

  if (CONFIG.ACCOUNT_LABEL) {
    accountSelector = accountSelector
      .withCondition('LabelNames CONTAINS "' + CONFIG.ACCOUNT_LABEL + '"');
  }

  accountSelector.executeInParallel('processAccount', 'processResults');
}

/**
 * Finds conflicts and returns the results in a format suitable for
 * executeInParallel().
 *
 * @return {string} JSON stringified list of conflict objects.
 */
function processAccount() {
  return JSON.stringify(findAllConflicts());
}

/**
 * Outputs conflicts to a spreadsheet and sends an email alert if applicable.
 *
 * @param {Array.<Object>} results A list of ExecutionResult objects.
 */
function processResults(results) {
  var hasConflicts = false;
  var spreadsheet = SpreadsheetApp.openByUrl(CONFIG.SPREADSHEET_URL);
  if (CONFIG.COPY_SPREADSHEET) {
    spreadsheet = spreadsheet.copy('Negative Keyword Conflicts');
  }
  initializeSpreadsheet(spreadsheet);

  for (var i = 0; i < results.length; i++) {
    if (!results[i].getError()) {
      hasConflicts = outputConflicts(spreadsheet, results[i].getCustomerId(),
          JSON.parse(results[i].getReturnValue())) || hasConflicts;
    } else {
      Logger.log('Processing for ' + results[i].getCustomerId() + ' failed.');
    }
  }

  if (hasConflicts && CONFIG.RECIPIENT_EMAILS) {
    sendEmail(spreadsheet);
  }
}

/**
 * Finds all negative keyword conflicts in an account.
 *
 * @return {Array.<Object>} An array of conflicts.
 */
function findAllConflicts() {
  var campaignIds;
  if (CONFIG.CAMPAIGN_LABEL) {
    campaignIds = getCampaignIdsWithLabel(CONFIG.CAMPAIGN_LABEL);
  } else {
    campaignIds = getAllCampaignIds();
  }

  var campaignCondition = '';
  if (campaignIds.length > 0) {
    campaignCondition = 'AND CampaignId IN [' + campaignIds.join(',') + ']';
  }

  Logger.log('Downloading keywords performance report');
  var query =
    'SELECT CampaignId, CampaignName, AdGroupId, AdGroupName, ' +
    '       Criteria, KeywordMatchType, IsNegative ' +
    'FROM KEYWORDS_PERFORMANCE_REPORT ' +
    'WHERE CampaignStatus = "ENABLED" AND AdGroupStatus = "ENABLED" AND ' +
    '      Status = "ENABLED" AND IsNegative IN [true, false] ' +
    '      ' + campaignCondition + ' ' +
    'DURING YESTERDAY';
  var report = AdWordsApp.report(query, REPORTING_OPTIONS);

  Logger.log('Building cache and populating with keywords');
  var cache = {};
  var numPositives = 0;
  var numNegatives = 0;

  var rows = report.rows();
  while (rows.hasNext()) {
    var row = rows.next();

    var campaignId = row['CampaignId'];
    var campaignName = row['CampaignName'];
    var adGroupId = row['AdGroupId'];
    var adGroupName = row['AdGroupName'];
    var keywordText = row['Criteria'];
    var keywordMatchType = row['KeywordMatchType'];
    var isNegative = row['IsNegative'];

    if (!cache[campaignId]) {
      cache[campaignId] = {
        campaignName: campaignName,
        adGroups: {},
        negatives: [],
        negativesFromLists: [],
      };
    }

    if (!cache[campaignId].adGroups[adGroupId]) {
      cache[campaignId].adGroups[adGroupId] = {
        adGroupName: adGroupName,
        positives: [],
        negatives: [],
      };
    }

    if (isNegative == 'true') {
      cache[campaignId].adGroups[adGroupId].negatives
        .push(normalizeKeyword(keywordText, keywordMatchType));
      numNegatives++;
    } else {
      cache[campaignId].adGroups[adGroupId].positives
        .push(normalizeKeyword(keywordText, keywordMatchType));
      numPositives++;
    }

    if (numPositives > CONFIG.MAX_POSITIVES ||
        numNegatives > CONFIG.MAX_NEGATIVES) {
      throw 'Trying to process too many keywords. Please restrict the ' +
            'script to a smaller subset of campaigns.';
    }
  }

  Logger.log('Downloading campaign negatives report');
  var query =
    'SELECT CampaignId, Criteria, KeywordMatchType ' +
    'FROM CAMPAIGN_NEGATIVE_KEYWORDS_PERFORMANCE_REPORT ' +
    'WHERE CampaignStatus = "ENABLED" ' +
    '      ' + campaignCondition;
  var report = AdWordsApp.report(query, REPORTING_OPTIONS);

  var rows = report.rows();
  while (rows.hasNext()) {
    var row = rows.next();

    var campaignId = row['CampaignId'];
    var keywordText = row['Criteria'];
    var keywordMatchType = row['KeywordMatchType'];

    if (cache[campaignId]) {
      cache[campaignId].negatives
        .push(normalizeKeyword(keywordText, keywordMatchType));
    }
  }

  Logger.log('Populating cache with negative keyword lists');
  var negativeKeywordLists =
    AdWordsApp.negativeKeywordLists().withCondition('Status = ACTIVE').get();

  while (negativeKeywordLists.hasNext()) {
    var negativeKeywordList = negativeKeywordLists.next();

    var negatives = [];
    var negativeKeywords = negativeKeywordList.negativeKeywords().get();

    while (negativeKeywords.hasNext()) {
      var negative = negativeKeywords.next();
      negatives.push(normalizeKeyword(negative.getText(),
                                      negative.getMatchType()));
    }

    var campaigns = negativeKeywordList.campaigns()
        .withCondition('Status = ENABLED').get();

    while (campaigns.hasNext()) {
      var campaign = campaigns.next();
      var campaignId = campaign.getId();

      if (cache[campaignId]) {
        cache[campaignId].negativesFromLists =
            cache[campaignId].negativesFromLists.concat(negatives);
      }
    }
  }

  Logger.log('Finding negative conflicts');
  var conflicts = [];

  // Adds context about the conflict.
  var enrichConflict = function(conflict, campaignId, adGroupId, level) {
    conflict.campaignId = campaignId;
    conflict.adGroupId = adGroupId;
    conflict.campaignName = cache[campaignId].campaignName;
    conflict.adGroupName = cache[campaignId].adGroups[adGroupId].adGroupName;
    conflict.level = level;
  };

  for (var campaignId in cache) {
    for (var adGroupId in cache[campaignId].adGroups) {
      var positives = cache[campaignId].adGroups[adGroupId].positives;

      var negativeLevels = {
        'Campaign': cache[campaignId].negatives,
        'Ad Group': cache[campaignId].adGroups[adGroupId].negatives,
        'Negative list': cache[campaignId].negativesFromLists
      };

      for (var level in negativeLevels) {
        var newConflicts =
          checkForConflicts(negativeLevels[level], positives);

        for (var i = 0; i < newConflicts.length; i++) {
          enrichConflict(newConflicts[i], campaignId, adGroupId, level);
        }
        conflicts = conflicts.concat(newConflicts);
      }
    }
  }

  return conflicts;
}

/**
 * Saves conflicts to a spreadsheet if present.
 *
 * @param {Object} spreadsheet The spreadsheet object.
 * @param {string} customerId The account the conflicts are for.
 * @param {Array.<Object>} conflicts A list of conflicts.
 * @return {boolean} True if there were conflicts and false otherwise.
 */
function outputConflicts(spreadsheet, customerId, conflicts) {
  if (conflicts.length > 0) {
    saveConflictsToSpreadsheet(spreadsheet, customerId, conflicts);
    Logger.log('Conflicts were found for ' + customerId +
               '. See ' + spreadsheet.getUrl());
    return true;
  } else {
    Logger.log('No conflicts were found for ' + customerId + '.');
    return false;
  }
}

/**
 * Sets up the spreadsheet to receive output.
 *
 * @param {Object} spreadsheet The spreadsheet object.
 */
function initializeSpreadsheet(spreadsheet) {
  // Make sure the spreadsheet is using the account's timezone.
  spreadsheet.setSpreadsheetTimeZone(AdWordsApp.currentAccount().getTimeZone());

  // Clear the last run date on the spreadsheet.
  spreadsheet.getRangeByName('RunDate').clearContent();

  // Clear all rows in the spreadsheet below the header row.
  var outputRange = spreadsheet.getRangeByName('Headers')
    .offset(1, 0, spreadsheet.getSheetByName('Conflicts')
        .getDataRange().getLastRow())
    .clearContent();
}

/**
 * Saves conflicts for a particular account to the spreadsheet starting at the
 * first unused row.
 *
 * @param {Object} spreadsheet The spreadsheet object.
 * @param {string} customerId The account that the conflicts are for.
 * @param {Array.<Object>} conflicts A list of conflicts.
 */
function saveConflictsToSpreadsheet(spreadsheet, customerId, conflicts) {
  // Find the first open row on the Report tab below the headers and create a
  // range large enough to hold all of the failures, one per row.
  var lastRow = spreadsheet.getSheetByName('Conflicts')
    .getDataRange().getLastRow();
  var headers = spreadsheet.getRangeByName('Headers');
  var outputRange = headers
    .offset(lastRow - headers.getRow() + 1, 0, conflicts.length);

  // Build each row of output values in the order of the columns.
  var outputValues = [];
  for (var i = 0; i < conflicts.length; i++) {
    var conflict = conflicts[i];
    outputValues.push([
      customerId,
      conflict.negative,
      conflict.level,
      conflict.positives.join(', '),
      conflict.campaignName,
      conflict.adGroupName
    ]);
  }
  outputRange.setValues(outputValues);

  spreadsheet.getRangeByName('RunDate').setValue(new Date());

  for (var i = 0; i < CONFIG.RECIPIENT_EMAILS.length; i++) {
    spreadsheet.addEditor(CONFIG.RECIPIENT_EMAILS[i]);
  }
}

/**
 * Sends an email to a list of email addresses with a link to the spreadsheet.
 *
 * @param {Object} spreadsheet The spreadsheet object.
 */
function sendEmail(spreadsheet) {
  MailApp.sendEmail(CONFIG.RECIPIENT_EMAILS.join(','),
      'Negative Keyword Conflicts Found',
      'Negative keyword conflicts were found in your ' +
      'AdWords account(s). See ' +
      spreadsheet.getUrl() + ' for details. You may wish ' +
      'to delete the negative keywords causing the ' +
      'the conflicts.');
}

/**
 * Retrieves the campaign IDs of a campaign iterator.
 *
 * @param {Object} campaigns A CampaignIterator object.
 * @return {Array.<Integer>} An array of campaign IDs.
 */
function getCampaignIds(campaigns) {
  var campaignIds = [];
  while (campaigns.hasNext()) {
    campaignIds.push(campaigns.next().getId());
  }

  return campaignIds;
}

/**
 * Retrieves all campaign IDs in an account.
 *
 * @return {Array.<Integer>} An array of campaign IDs.
 */
function getAllCampaignIds() {
  return getCampaignIds(AdWordsApp.campaigns().get());
}

/**
 * Retrieves the campaign IDs with a given label.
 *
 * @param {string} labelText The text of the label.
 * @return {Array.<Integer>} An array of campaign IDs, or null if the
 *     label was not found.
 */
function getCampaignIdsWithLabel(labelText) {
  var labels = AdWordsApp.labels()
    .withCondition('Name = "' + labelText + '"')
    .get();

  if (!labels.hasNext()) {
    return null;
  }
  var label = labels.next();

  return getCampaignIds(label.campaigns().get());
}

/**
 * Compares a set of negative keywords and positive keywords to identify
 * conflicts where a negative keyword blocks a positive keyword.
 *
 * @param {Array.<Object>} negatives A list of objects with fields
 *     display, raw, and matchType.
 * @param {Array.<Object>} positives A list of objects with fields
 *     display, raw, and matchType.
 * @return {Array.<Object>} An array of conflicts, each an object with
 *     the negative keyword display text causing the conflict and an array
 *     of blocked positive keyword display texts.
 */
function checkForConflicts(negatives, positives) {
  var conflicts = [];

  for (var i = 0; i < negatives.length; i++) {
    var negative = negatives[i];
    var anyBlock = false;
    var blockedPositives = [];

    for (var j = 0; j < positives.length; j++) {
      var positive = positives[j];

      if (negativeBlocksPositive(negative, positive)) {
        anyBlock = true;
        blockedPositives.push(positive.display);
      }
    }

    if (anyBlock) {
      conflicts.push({
        negative: negative.display,
        positives: blockedPositives
      });
    }
  }

  return conflicts;
}

/**
 * Removes leading and trailing match type punctuation from the first and
 * last character of a keyword's text, if any.
 *
 * @param {string} text A keyword's text to remove punctuation from.
 * @param {string} open The character that may be the first character.
 * @param {string} close The character that may be the last character.
 * @return {Object} The same text, trimmed of open and close if present.
 */
function trimKeyword(text, open, close) {
  if (text.substring(0, 1) == open &&
      text.substring(text.length - 1) == close) {
    return text.substring(1, text.length - 1);
  }

  return text;
}

/**
 * Normalizes a keyword by returning a raw and display version and consistent
 * match type. The raw version has no leading and trailing punctuation for
 * phrase and exact match keywords, no consecutive whitespace, is all
 * lowercase, and removes broad match qualifiers. The display version has no
 * consecutive whitespace and is all lowercase. The match type is uppercase.
 *
 * @param {string} text A keyword's text that should be normalized.
 * @param {string} matchType The keyword's match type.
 * @return {Object} An object with fields display, raw, and matchType.
 */
function normalizeKeyword(text, matchType) {
  var display;
  var raw = text;
  matchType = matchType.toUpperCase();

  // Replace leading and trailing "" for phrase match keywords and [] for
  // exact match keywords, if it is there.
  if (matchType == 'PHRASE') {
    raw = trimKeyword(raw, '"', '"');
  } else if (matchType == 'EXACT') {
    raw = trimKeyword(raw, '[', ']');
  }

  // Collapse any runs of whitespace into single spaces.
  raw = raw.replace(new RegExp('\\s+', 'g'), ' ');

  // Keywords are not case sensitive.
  raw = raw.toLowerCase();

  // Set display version.
  display = raw;
  if (matchType == 'PHRASE') {
    display = '"' + display + '"';
  } else if (matchType == 'EXACT') {
    display = '[' + display + ']';
  }

  // Remove broad match modifier '+' sign.
  raw = raw.replace(new RegExp('\\s\\+', 'g'), ' ');

  return {display: display, raw: raw, matchType: matchType};
}

/**
 * Tests whether all of the tokens in one keyword's raw text appear in
 * the tokens of a second keyword's text.
 *
 * @param {string} keywordText1 the raw keyword text whose tokens may
 *     appear in the other keyword text.
 * @param {string} keywordText2 the raw keyword text which may contain
 *     the tokens of the other keyword.
 * @return {boolean} Whether all tokens in keywordText1 appear among
 *     the tokens of keywordText2.
 */
function hasAllTokens(keywordText1, keywordText2) {
  var keywordTokens1 = keywordText1.split(' ');
  var keywordTokens2 = keywordText2.split(' ');

  for (var i = 0; i < keywordTokens1.length; i++) {
    if (keywordTokens2.indexOf(keywordTokens1[i]) == -1) {
      return false;
    }
  }

  return true;
}

/**
 * Tests whether all of the tokens in one keyword's raw text appear in
 * order in the tokens of a second keyword's text.
 *
 * @param {string} keywordText1 the raw keyword text whose tokens may
 *     appear in the other keyword text.
 * @param {string} keywordText2 the raw keyword text which may contain
 *     the tokens of the other keyword in order.
 * @return {boolean} Whether all tokens in keywordText1 appear in order
 *     among the tokens of keywordText2.
 */
function isSubsequence(keywordText1, keywordText2) {
  return (' ' + keywordText2 + ' ').indexOf(' ' + keywordText1 + ' ') >= 0;
}

/**
 * Tests whether a negative keyword blocks a positive keyword, taking into
 * account their match types.
 *
 * @param {Object} negative An object with fields raw and matchType.
 * @param {Object} positive An object with fields raw and matchType.
 * @return {boolean} Whether the negative keyword blocks the positive keyword.
 */
function negativeBlocksPositive(negative, positive) {
  var isNegativeStricter;

  switch (positive.matchType) {
    case 'BROAD':
      isNegativeStricter = negative.matchType != 'BROAD';
      break;

    case 'PHRASE':
      isNegativeStricter = negative.matchType == 'EXACT';
      break;

    case 'EXACT':
      isNegativeStricter = false;
      break;
  }

  if (isNegativeStricter) {
    return false;
  }

  switch (negative.matchType) {
    case 'BROAD':
      return hasAllTokens(negative.raw, positive.raw);
      break;

    case 'PHRASE':
      return isSubsequence(negative.raw, positive.raw);
      break;

    case 'EXACT':
      return positive.raw === negative.raw;
      break;
  }
}

/**
 * Validates the provided spreadsheet URL and email address
 * to make sure that they're set up properly. Throws a descriptive error message
 * if validation fails.
 *
 * @throws {Error} If the spreadsheet URL or email hasn't been set
 */
function validateConfig() {
  if (CONFIG.SPREADSHEET_URL == 'YOUR_SPREADSHEET_URL') {
    throw new Error('Please specify a valid Spreadsheet URL. You can find' +
        ' a link to a template in the associated guide for this script.');
  }
  if (CONFIG.RECIPIENT_EMAILS &&
      CONFIG.RECIPIENT_EMAILS[0] == 'YOUR_EMAIL_HERE') {
    throw new Error('Please either specify a valid email address or clear' +
        ' the RECIPIENT_EMAILS field.');
  }
}
