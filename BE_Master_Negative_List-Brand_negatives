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
 * @name Master Negative List Script for AdWords manager accounts
 *
 * @overview The Master Negative List script for AdWords manager accounts
 *     applies negative keywords and placements from a spreadsheet to multiple
 *     campaigns in your account using shared keyword and placement lists. The
 *     script can process multiple AdWords accounts in parallel. See
 *     https://developers.google.com/adwords/scripts/docs/solutions/mccapp-master-negative-list
 *     for more details.
 *
 * @author AdWords Scripts Team [adwords-scripts@googlegroups.com]
 *
 * @version 1.0.2
 *
 * @changelog
 * - version 1.0.2
 *   - Added validation for external spreadsheet setup.
 * - version 1.0.1
 *   - Improvements to time zone handling.
 * - version 1.0
 *   - Released initial version.
 */

/**
 * The URL of the tracking spreadsheet. This should be a copy of
 * https://goo.gl/i4q728
 */
var SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1y_v_jw8Xr9_V4TXJuzXKzoxTkvDKIqiPKCQrbfUWUWU/edit#gid=1369822905';

/**
 * Keep track of the spreadsheet names for various criteria types, as well as
 * the criteria type being processed.
 */
var CriteriaType = {
  KEYWORDS: 'Keywords',
  PLACEMENTS: 'Placements'
};

/**
 * The code to execute when running the script.
 */
function main() {
  var config = readConfig();

  var accountSelector = MccApp.accounts();
  accountSelector.withCondition("LabelNames CONTAINS '" + config.customerids + "'");

  accountSelector.executeInParallel('processAccounts', 'postProcess');
}

/**
 * Process an account when processing multiple accounts under an AdWords manager
 * account in parallel.
 *
 * @return {string} A JSON string that summarizes the number of keywords and
 *     placements synced, and the number of campaigns processed.
 */
function processAccounts() {
  return JSON.stringify(syncMasterLists());
}

/**
 * Callback method after processing accounts, when processing multiple accounts
 * under an AdWords manager account in parallel.
 *
 * @param {Array.<MccApp.ExecutionResult>} results The execution results from
 *     the accounts that were processed by this script.
 */
function postProcess(results) {
  var config = readConfig();
  var emailParams = {
    // Number of placements that were synced.
    PlacementCount: 0,
    // Number of keywords that were synced.
    KeywordCount: 0,
    // Summary of customers who were synced.
    Customers: {
      // How many customers were synced?
      Success: 0,
      // How many customers failed to sync?
      Failure: 0,
      // Details of each account processed. Contains 3 properties:
      // CustomerId, CampaignCount, Status.
      Details: []
    }
  };

  for (var i = 0; i < results.length; i++) {
    var customerResult = {
      // The customer ID that was processed.
      CustomerId: results[i].getCustomerId(),
      // Number of campaigns that were synced.
      CampaignCount: 0,
      // Status of processing this account - OK / ERROR / TIMEOUT
      Status: results[i].getStatus()
    };

    if (results[i].getStatus() == 'OK') {
      var retval = JSON.parse(results[i].getReturnValue());
      customerResult.CampaignCount = retval.CampaignCount;
      if (emailParams.Customers.Success == 0) {
        emailParams.KeywordCount = retval.KeywordCount;
        emailParams.PlacementCount = retval.PlacementCount;
      }
      emailParams.Customers.Success++;
    } else {
      emailParams.Customers.Failure++;
    }
    emailParams.Customers.Details.push(customerResult);
  }

  var spreadsheet = validateAndGetSpreadsheet(SPREADSHEET_URL);

  // Make sure the spreadsheet is using the account's timezone.
  spreadsheet.setSpreadsheetTimeZone(AdWordsApp.currentAccount().getTimeZone());
  spreadsheet.getRangeByName('LastRun').setValue(new Date());
  spreadsheet.getRangeByName('CustomerId').setValue(
      AdWordsApp.currentAccount().getCustomerId());

  sendEmail(config, emailParams);
}

/**
 * Sends a summary email about the changes that this script made.
 *
 * @param {Object} config The configuration object.
 * @param {Object} emailParams Contains details required to create the email
 *     body.
 */
function sendEmail(config, emailParams) {
  var html = [];

  html.push('<html>',
              '<head></head>',
               '<body>',
                  "<table style='font-family:Arial,Helvetica; " +
                       'border-collapse:collapse;font-size:10pt; ' +
                       "color:#444444; border: solid 1px #dddddd;' " +
                       "width='600' cellpadding=20>",
                     '<tr>',
                       '<td>',
                         '<p>Hello,</p>',
                         '<p>The Master Negative List script synced a total ' +
                              'of <b>' + emailParams.KeywordCount + '</b> ' +
                              'keywords and <b>' + emailParams.PlacementCount +
                              '</b> placements. <b>' +
                              (emailParams.Customers.Success +
                               emailParams.Customers.Failure) +
                              '</b> accounts were processed, of which <b>' +
                              emailParams.Customers.Success + '</b> ' +
                              'succeeded, and <b>' +
                              emailParams.Customers.Failure + '</b> failed. ' +
                              'See the table below' +
                              ' for details.</p>',
                         "<table border='1' width='100%' " +
                             "style='border-collapse: collapse; " +
                             "border: solid 1px #dddddd;font-size:10pt;'>",
                           '<tr>',
                             '<th>CustomerId</th>',
                             '<th>Synced Campaigns</th>',
                             '<th>Status</th>',
                           '</tr>'
           );

  for (var i = 0; i < emailParams.Customers.Details.length; i++) {
    var detail = emailParams.Customers.Details[i];
    html.push('<tr>',
                '<td>' + detail.CustomerId + '</td>',
                '<td>' + detail.CampaignCount + '</td>',
                '<td>' + detail.Status + '</td>',
              '</tr>'
           );
  }

  html.push('</table>',
                       '<p>Cheers<br />AdWords Scripts Team</p>',
                     '</td>',
                   '</tr>',
                 '</table>',
               '</body>',
             '</html>'
           );

  if (config.email != '') {
    MailApp.sendEmail({
      to: config.email,
      subject: 'Master Negative List Script',
      htmlBody: html.join('\n')
    });
  }
}

/**
 * Synchronizes the negative criteria list in an account with the master list
 * in the user spreadsheet.
 *
 * @return {Object} A summary of the number of keywords and placements synced,
 *     and the number of campaigns to which these lists apply.
 */
function syncMasterLists() {
  var config = readConfig();
  var syncedCampaignCount = 0;

  var keywordListDetails = syncCriteriaInNegativeList(config,
      CriteriaType.KEYWORDS);
  syncedCampaignCount = syncCampaignList(config, keywordListDetails.SharedList,
      CriteriaType.KEYWORDS);

  var placementListDetails = syncCriteriaInNegativeList(config,
      CriteriaType.PLACEMENTS);
  syncedCampaignCount = syncCampaignList(config,
     placementListDetails.SharedList, CriteriaType.PLACEMENTS);

  return {
    'CampaignCount': syncedCampaignCount,
    'PlacementCount': placementListDetails.CriteriaCount,
    'KeywordCount': keywordListDetails.CriteriaCount
  };
}

/**
 * Synchronizes the list of campaigns covered by a negative list against the
 * desired list of campaigns to be covered by the master list.
 *
 * @param {Object} config The configuration object.
 * @param {AdWordsApp.NegativeKeywordList|AdWordsApp.ExcludedPlacementList}
 *    sharedList The shared negative criterion list to be synced against the
 *    master list.
 * @param {String} criteriaType The criteria type for the shared negative list.
 *
 * @return {Number} The number of campaigns synced.
 */
function syncCampaignList(config, sharedList, criteriaType) {
  var campaignIds = getLabelledCampaigns(config.label);
  var totalCampaigns = Object.keys(campaignIds).length;

  var listedCampaigns = sharedList.campaigns().get();

  var campaignsToRemove = [];

  while (listedCampaigns.hasNext()) {
    var listedCampaign = listedCampaigns.next();
    if (listedCampaign.getId() in campaignIds) {
      delete campaignIds[listedCampaign.getId()];
    } else {
      campaignsToRemove.push(listedCampaign);
    }
  }

  // Anything left over in campaignIds starts a new list.
  var campaignsToAdd = AdWordsApp.campaigns().withIds(
      Object.keys(campaignIds)).get();
  while (campaignsToAdd.hasNext()) {
    var campaignToAdd = campaignsToAdd.next();

    if (criteriaType == CriteriaType.KEYWORDS) {
      campaignToAdd.addNegativeKeywordList(sharedList);
    } else if (criteriaType == CriteriaType.PLACEMENTS) {
      campaignToAdd.addExcludedPlacementList(sharedList);
    }
  }

  for (var i = 0; i < campaignsToRemove.length; i++) {
    if (criteriaType == CriteriaType.KEYWORDS) {
      campaignsToRemove[i].removeNegativeKeywordList(sharedList);
    } else if (criteriaType == CriteriaType.PLACEMENTS) {
      campaignsToRemove[i].removeExcludedPlacementList(sharedList);
    }
  }

  return totalCampaigns;
}

/**
 * Gets a list of campaigns having a particular label.
 *
 * @param {String} labelText The label text.
 *
 * @return {Array.<Number>} An array of campaign IDs having the specified
 *     label.
 */
function getLabelledCampaigns(labelText) {
  var campaignIds = {};

  if (labelText != '') {
    var label = labelText;
    var campaigns = AdWordsApp.campaigns()
                    .withCondition('Status in [ENABLED, PAUSED]')
                    .withCondition('Name CONTAINS "' + label + '"').get();
  } else {
    var campaigns = AdWordsApp.campaigns().withCondition(
        'Status in [ENABLED, PAUSED]').get();
  }

  while (campaigns.hasNext()) {
    var campaign = campaigns.next();
    campaignIds[campaign.getId()] = 1;
  }
  return campaignIds;
}

/**
 * Synchronizes the criteria in a shared negative criteria list with the user
 * spreadsheet.
 *
 * @param {Object} config The configuration object.
 * @param {String} criteriaType The criteria type for the shared negative list.
 *
 * @return {Object} A summary of the synced negative list, and the number of
 *     criteria that were synced.
 */
function syncCriteriaInNegativeList(config, criteriaType) {
  var criteriaFromSheet = loadCriteria(criteriaType);
  var totalCriteriaCount = Object.keys(criteriaFromSheet).length;

  var sharedList = null;
  var listName = config.listname[criteriaType];

  sharedList = createNegativeListIfRequired(listName, criteriaType);

  var negativeCriteria = null;

  try {
    if (criteriaType == CriteriaType.KEYWORDS) {
      negativeCriteria = sharedList.negativeKeywords().get();
    } else if (criteriaType == CriteriaType.PLACEMENTS) {
      negativeCriteria = sharedList.excludedPlacements().get();
    }
  } catch (e) {
    Logger.log('Failed to retrieve shared list. Error says ' + e);
    if (AdWordsApp.getExecutionInfo().isPreview()) {
      var message = Utilities.formatString('The script cannot create the ' +
          'negative %s list in preview mode. Either run the script without ' +
          'preview, or create a negative %s list with name "%s" manually ' +
          'before previewing the script.', criteriaType, criteriaType,
          listName);
      Logger.log(message);
    }
    throw e;
  }

  var criteriaToDelete = [];

  while (negativeCriteria.hasNext()) {
    var negativeCriterion = negativeCriteria.next();
    var key = null;

    if (criteriaType == CriteriaType.KEYWORDS) {
      key = negativeCriterion.getText();
    } else if (criteriaType == CriteriaType.PLACEMENTS) {
      key = negativeCriterion.getUrl();
    }

    if (key in criteriaFromSheet) {
      // Nothing to do with this criteria. Remove it from loaded list.
      delete criteriaFromSheet[key];
    } else {
      // This criterion is not in the sync list. Mark for deletion.
      criteriaToDelete.push(negativeCriterion);
    }
  }

  // Whatever left in the sync list are new items.
  if (criteriaType == CriteriaType.KEYWORDS) {
    sharedList.addNegativeKeywords(Object.keys(criteriaFromSheet));
  } else if (criteriaType == CriteriaType.PLACEMENTS) {
    sharedList.addExcludedPlacements(Object.keys(criteriaFromSheet));
  }

  for (var i = 0; i < criteriaToDelete.length; i++) {
    criteriaToDelete[i].remove();
  }

  return {
    'SharedList': sharedList,
    'CriteriaCount': totalCriteriaCount,
    'Type': criteriaType
  };
}

/**
 * Creates a shared negative criteria list if required.
 *
 * @param {string} listName The name of shared negative criteria list.
 * @param {String} listType The criteria type for the shared negative list.
 *
 * @return {AdWordsApp.NegativeKeywordList|AdWordsApp.ExcludedPlacementList} An
 *     existing shared negative criterion list if it already exists in the
 *     account, or the newly created list if one didn't exist earlier.
 */
function createNegativeListIfRequired(listName, listType) {
  var negativeListSelector = null;
  if (listType == CriteriaType.KEYWORDS) {
    negativeListSelector = AdWordsApp.negativeKeywordLists();
  } else if (listType == CriteriaType.PLACEMENTS) {
    negativeListSelector = AdWordsApp.excludedPlacementLists();
  }
  var negativeListIterator = negativeListSelector.withCondition(
      "Name = '" + listName + "'").get();

  if (negativeListIterator.totalNumEntities() == 0) {
    var builder = null;

    if (listType == CriteriaType.KEYWORDS) {
      builder = AdWordsApp.newNegativeKeywordListBuilder();
    } else if (listType == CriteriaType.PLACEMENTS) {

      builder = AdWordsApp.newExcludedPlacementListBuilder();
    }

    var negativeListOperation = builder.withName(listName).build();
    return negativeListOperation.getResult();
  } else {
    return negativeListIterator.next();
  }
}

/**
 * Loads a list of criteria from the user spreadsheet.
 *
 * @param {string} sheetName The name of shared negative criteria list.
 *
 * @return {Object} A map of the list of criteria loaded from the spreadsheet.
 */
function loadCriteria(sheetName) {
  var spreadsheet = validateAndGetSpreadsheet(SPREADSHEET_URL);
  var sheet = spreadsheet.getSheetByName(sheetName);
  var values = sheet.getRange('B4:B').getValues();

  var retval = {};
  for (var i = 0; i < values.length; i++) {
    var keyword = values[i][0].toString().trim();
    if (keyword != '') {
      retval[keyword] = 1;
    }
  }
  return retval;
}

/**
 * Loads a configuration object from the spreadsheet.
 *
 * @return {Object} A configuration object.
 */
function readConfig() {
  var spreadsheet = validateAndGetSpreadsheet(SPREADSHEET_URL);
  var values = spreadsheet.getRangeByName('ConfigurationValues').getValues();

  var config = {
    'label': values[0][0],
    'listname': {
    },
    'email': values[3][0],
    'customerids': values[4][0].trim()
  };
  config.listname[CriteriaType.KEYWORDS] = values[1][0];
  config.listname[CriteriaType.PLACEMENTS] = values[2][0];
  return config;
}

/**
 * DO NOT EDIT ANYTHING BELOW THIS LINE.
 * Please modify your spreadsheet URL at the top of the file only.
 */

/**
 * Validates the provided spreadsheet URL and email address
 * to make sure that they're set up properly. Throws a descriptive error message
 * if validation fails.
 *
 * @param {string} spreadsheeturl The URL of the spreadsheet to open.
 * @return {Spreadsheet} The spreadsheet object itself, fetched from the URL.
 * @throws {Error} If the spreadsheet URL or email hasn't been set
 */
function validateAndGetSpreadsheet(spreadsheeturl) {
  if (spreadsheeturl == 'INSERT_SPREADSHEET_URL_HERE') {
    throw new Error('Please specify a valid Spreadsheet URL. You can find' +
        ' a link to a template in the associated guide for this script.');
  }
  var spreadsheet = SpreadsheetApp.openByUrl(spreadsheeturl);
  return spreadsheet;
}
