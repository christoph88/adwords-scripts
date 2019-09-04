function main() {
  Logger.log('check https://docs.google.com/spreadsheets/d/1Db6uwMTHTEJrCeiuXoSnMW7v93KQ9KvgvryUBrQlUVk/edit#gid=0');
  removeNegativeKeywordsFromAdGroups()
  resetSheet()
  // only add negatives to search ad groups
  getKeywordsInAdGroup("_search", "_B_");
  // get NB seperately because they can't be added to branded campaigns
  getKeywordsInAdGroup("_search", "_NB_");
}

function getKeywordsInAdGroup(campaigns, type) {
  Logger.log('getting all keywords');
  var keywordIterator = AdsApp.keywords()
      .withCondition('CampaignName CONTAINS_IGNORE_CASE "' + campaigns + '"')
      .withCondition('CampaignName CONTAINS_IGNORE_CASE "' + type + '"')
      .withCondition('AdGroupStatus != REMOVED')    
      .withCondition('CampaignStatus != REMOVED')
      .get();
  if (keywordIterator.hasNext()) {
    while (keywordIterator.hasNext()) {
      var keyword = keywordIterator.next();
      addNegativeKeywordToAdGroup(campaigns, type, keyword.getText(), keyword.getAdGroup().getName(), keyword.getCampaign().getName());      
    }
  }
}

function addNegativeKeywordToAdGroup(campaigns, type, keyword, currentAdGroup, currentCampaign) {
  // add keywords to all other campaigns
  // exclude current campaign
  // exclude possible long tail campaigns based on this one
  Logger.log('Add ' + keyword + ' to relevant adgroups');
  
  var shortTailExclusion = currentAdGroup || currentAdGroup.match(/\-.*$/g)[0];
  var withinSameLanguage = currentCampaign.match(/_BE(NL|FR)_/g)[0];
  

    var adGroupIterator = AdsApp.adGroups()
      // do not add to the current ad group
      .withCondition('Name != "' + currentAdGroup + '"')
      // do not add to ad groups having the same short tail
      .withCondition('Name DOES_NOT_CONTAIN_IGNORE_CASE "' + shortTailExclusion + '"')
      .withCondition('Status != REMOVED')    
      .withCondition('CampaignStatus != REMOVED')
      // only add to search campaigns
      .withCondition('CampaignName CONTAINS_IGNORE_CASE "' + campaigns + '"') 
      // stay within the same language
      .withCondition('CampaignName CONTAINS_IGNORE_CASE "' + withinSameLanguage + '"') 
      // do not add NB negatives to B campaigns
      .withCondition('CampaignName CONTAINS_IGNORE_CASE "' + (type === '_NB_' ? '_NB_' : '_' ) + '"') 
      .get();
  
  if ( adGroupIterator.hasNext() ) {
    var adGroup = adGroupIterator.next();
    appendARow(currentCampaign, currentAdGroup, keyword, adGroup.getCampaign().getName(), adGroup.getName());
    adGroup.createNegativeKeyword(keyword);
  
  }
  
  
}

function removeNegativeKeywordsFromAdGroups() {
  // If you have multiple ad groups with the same name, this snippet will
  // pick an arbitrary matching ad group each time. In such cases, just
  // filter on the campaign name as well:
  //
  // AdsApp.adGroups()
  //     .withCondition('Name = "INSERT_ADGROUP_NAME_HERE"')
  //     .withCondition('CampaignName = "INSERT_CAMPAIGN_NAME_HERE"')
  Logger.log('removing current negatives from all AdGroups');
  var adGroupIterator = AdsApp.adGroups()
      .get();
  if (adGroupIterator.hasNext()) {
    var adGroup = adGroupIterator.next();
    var negativeKeywordIterator = adGroup.negativeKeywords().get();
    while (negativeKeywordIterator.hasNext()) {
      var negativeKeyword = negativeKeywordIterator.next();
      negativeKeyword.remove();
    }
  }
}

function appendARow(currentCampaign, currentAdgroup, keyword, toCampaign, toAdgroup) {
  var SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1Db6uwMTHTEJrCeiuXoSnMW7v93KQ9KvgvryUBrQlUVk/edit#gid=0';
  // Name of the specific sheet in the spreadsheet.
  var SHEET_NAME = 'data';

  var ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
  var sheet = ss.getSheetByName(SHEET_NAME);
 
  
  // append rows
  //sheet.appendRow(['timestamp','currentCampaign', 'currentAdgroup', 'keyword', 'toCampaign', 'toAdgroup']);
  sheet.appendRow([new Date(),currentCampaign, currentAdgroup, '="' + keyword + '"', toCampaign, toAdgroup]);
}

function resetSheet() {
  var SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1Db6uwMTHTEJrCeiuXoSnMW7v93KQ9KvgvryUBrQlUVk/edit#gid=0';
  // Name of the specific sheet in the spreadsheet.
  var SHEET_NAME = 'data';

  var ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
  var sheet = ss.getSheetByName(SHEET_NAME);
 
  sheet.clear();
  // append rows
  sheet.appendRow(['timestamp','currentCampaign', 'currentAdgroup', 'keyword', 'toCampaign', 'toAdgroup']);
 
}

