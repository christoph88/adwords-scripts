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
 * @name Keyword Labeler
 *
 * @overview The Keyword Labeler script labels keywords based on rules that
 *     you define. For example, you can create a rule to label keywords that
 *     are underperforming. Later, you can filter for this label in AdWords
 *     to decide whether to pause or remove those keywords. Rules don't have
 *     to be based solely on a keyword's performance. They can also be based
 *     on properties of a keyword such as its text or match type. For example,
 *     you could define "branded" keywords as those containing proper nouns
 *     associated with your brand, then label those keywords based on
 *     different performance thresholds versus "non-branded" keywords.
 *     Finally, the script sends an email linking to a spreadsheet when new
 *     keywords have been labeled. See
 *     https://developers.google.com/adwords/scripts/docs/solutions/labels
 *     for more details.
 *
 * @author AdWords Scripts Team [adwords-scripts@googlegroups.com]
 *
 * @version 1.1.1
 *
 * @changelog
 * - version 1.1.1
 *   - Improvements to time zone handling.
 * - version 1.1
 *   - Modified to allow generic rules and labeling.
 * - version 1.0
 *   - Released initial version.
 */

var CONFIG = {
  // URL of the spreadsheet template.
  // This should be a copy of https://goo.gl/uhK6nS.
  SPREADSHEET_URL: 'https://docs.google.com/spreadsheets/d/1wbNuaaIE-u_cm2UNgxQhUZY3_i0g_Pz0yHbsfon8x6k/edit',
  SPREADSHEET_NAME: AdWordsApp.currentAccount().getName() + ' - keyword labels applied',
  NOTIFY: 0,

  // Array of addresses to be alerted via email if labels are applied.
  RECIPIENT_EMAILS: [
    'christoph.geypen@groupepvcp.com'
  ],

  // Selector conditions to apply for all rules.
  GLOBAL_CONDITIONS: [
    'CampaignStatus = ENABLED',
    'AdGroupStatus = ENABLED',
    'Status = ENABLED'
  ],

  // Default date range over which statistics fields are retrieved.
  // Used when fetching keywords if a rule doesn't specify a date range.
  DEFAULT_DATE_RANGE: 'LAST_14_DAYS'
};

/**
 * Defines the rules by which keywords will be labeled.
 * The labelName field is required. Other fields may be null.
 * @type {Array.<{
 *     conditions: Array.<string>,
 *     dateRange: string,
 *     filter: function(Object): boolean,
 *     labelName: string,
 *   }>
 * }
 */
var RULES = [
  {
    conditions: [
      'Conversions = 0',
      'Impressions > 100'
    ]
    ,labelName: 'performance - no direct conversions last 14 days'
  }
  ,{
    conditions: [
      'Conversions = 0',
      'ClickAssistedConversions = 0',
      'Impressions > 100'
    ]
    ,labelName: 'performance - no conversion last 14 days'
  }
];

function main() {
  var results = processAccount();
  processResults(results);
}

/**
 * Processes the rules on the current account.
 *
 * @return {Array.<Object>} An array of changes made, each having
 *     a customerId, campaign name, ad group name, label name,
 *     and keyword text that the label was applied to.
 */
function processAccount() {
  ensureAccountLabels();
  var changes = applyLabels();

  return changes;
}

/**
 * Processes the results of the script.
 *
 * @param {Array.<Object>} changes An array of changes made, each having
 *     a customerId, campaign name, ad group name, label name,
 *     and keyword text that the label was applied to.
 */
function processResults(changes) {
  if (changes.length > 0 ) {
    if ( CONFIG.NOTIFY === 1 ) {
      Logger.log('Saving log and sending notification e-mail.');
      var spreadsheetUrl = saveToSpreadsheet(changes, CONFIG.RECIPIENT_EMAILS);
      sendEmail(spreadsheetUrl, CONFIG.RECIPIENT_EMAILS);
    } else {
      Logger.log('Labels are applied.');
    }
  } else {
    Logger.log('No labels were applied.');
  }
}

/**
 * Retrieves the names of all labels in the account.
 *
 * @return {Array.<string>} An array of label names.
 */
function getAccountLabelNames() {
  var labelNames = [];
  var iterator = AdWordsApp.labels().get();

  while (iterator.hasNext()) {
    labelNames.push(iterator.next().getName());
  }

  return labelNames;
}

/**
 * Checks that the account has a label for each rule and
 * creates the rule's label if it does not already exist.
 * Throws an exception if a rule does not have a labelName.
 */
function ensureAccountLabels() {
  var labelNames = getAccountLabelNames();

  for (var i = 0; i < RULES.length; i++) {
    var labelName = RULES[i].labelName;

    if (!labelName) {
      throw 'Missing labelName for rule #' + i;
    }

    if (labelNames.indexOf(labelName) == -1) {
      AdWordsApp.createLabel(labelName);
      labelNames.push(labelName);
    }
  }
}

/**
 * Retrieves the keywords in an account satisfying a rule
 * and that do not already have the rule's label.
 *
 * @param {Object} rule An element of the RULES array.
 * @return {Array.<Object>} An array of keywords.
 */
function getKeywordsForRule(rule) {
  var selector = AdWordsApp.keywords();

  // Add global conditions.
  for (var i = 0; i < CONFIG.GLOBAL_CONDITIONS.length; i++) {
    selector = selector.withCondition(CONFIG.GLOBAL_CONDITIONS[i]);
  }

  // Add selector conditions for this rule.
  if (rule.conditions) {
    for (var i = 0; i < rule.conditions.length; i++) {
      selector = selector.withCondition(rule.conditions[i]);
    }
  }

  // Exclude keywords that already have the label.
  selector.withCondition('LabelNames CONTAINS_NONE ["' + rule.labelName + '"]');

  // Add a date range.
  selector = selector.forDateRange(rule.dateRange || CONFIG.DEFAULT_DATE_RANGE);

  // Get the keywords.
  var iterator = selector.get();
  var keywords = [];

  // Check filter conditions for this rule.
  while (iterator.hasNext()) {
    var keyword = iterator.next();

    if (!rule.filter || rule.filter(keyword)) {
      keywords.push(keyword);
    }
  }

  return keywords;
}

/**
 * For each rule, determines the keywords matching the rule and which
 * need to have a label newly applied, and applies it.
 *
 * @return {Array.<Object>} An array of changes made, each having
 *     a customerId, campaign name, ad group name, label name,
 *     and keyword text that the label was applied to.
 */
function applyLabels() {
  var changes = [];
  var customerId = AdWordsApp.currentAccount().getCustomerId();

  for (var i = 0; i < RULES.length; i++) {
    var rule = RULES[i];
    var keywords = getKeywordsForRule(rule);
    var labelName = rule.labelName;

    for (var j = 0; j < keywords.length; j++) {
      var keyword = keywords[j];

      keyword.applyLabel(labelName);

      changes.push({
        customerId: customerId,
        campaignName: keyword.getCampaign().getName(),
        adGroupName: keyword.getAdGroup().getName(),
        labelName: labelName,
        keywordText: keyword.getText(),
      });
    }
  }

  return changes;
}

/**
 * Outputs a list of applied labels to a new spreadsheet and gives editor access
 * to a list of provided emails.
 *
 * @param {Array.<Object>} changes An array of changes made, each having
 *     a customerId, campaign name, ad group name, label name,
 *     and keyword text that the label was applied to.
 * @param {Array.<Object>} emails An array of email addresses.
 * @return {string} The URL of the spreadsheet.
 */
function saveToSpreadsheet(changes, emails) {
  var template = SpreadsheetApp.openByUrl(CONFIG.SPREADSHEET_URL);
  var spreadsheet = template.copy(CONFIG.SPREADSHEET_NAME);

  // Make sure the spreadsheet is using the account's timezone.
  spreadsheet.setSpreadsheetTimeZone(AdWordsApp.currentAccount().getTimeZone());

  Logger.log('Saving changes to spreadsheet at ' + spreadsheet.getUrl());

  var headers = spreadsheet.getRangeByName('Headers');
  var outputRange = headers.offset(1, 0, changes.length);

  var outputValues = [];
  for (var i = 0; i < changes.length; i++) {
    var change = changes[i];
    outputValues.push([
      change.customerId,
      change.campaignName,
      change.adGroupName,
      change.keywordText,
      change.labelName
    ]);
  }
  outputRange.setValues(outputValues);

  spreadsheet.getRangeByName('RunDate').setValue(new Date());

  for (var i = 0; i < emails.length; i++) {
    spreadsheet.addEditor(emails[i]);
  }

  return spreadsheet.getUrl();
}

/**
 * Sends an email to a list of email addresses with a link to a spreadsheet.
 *
 * @param {string} spreadsheetUrl The URL of the spreadsheet.
 * @param {Array.<Object>} emails An array of email addresses.
 */
function sendEmail(spreadsheetUrl, emails) {
  MailApp.sendEmail(emails.join(','), 'Keywords Newly Labeled',
      'Keywords have been newly labeled in your' +
      'AdWords account(s). See ' +
      spreadsheetUrl + ' for details.');
}
