function main() {
  // campaigns contain
  var campaigns = "_Search_";
  getKeywordsInAdGroup(campaigns);
}

function getKeywordsInAdGroup(campaigns) {
  var keywordIterator = AdsApp.keywords()
      .withCondition('CampaignName CONTAINS "' + campaigns + '"')
      .withCondition('AdGroupStatus != REMOVED')    
      .withCondition('CampaignStatus != REMOVED')
      .get();
  if (keywordIterator.hasNext()) {
    while (keywordIterator.hasNext()) {
      var keyword = keywordIterator.next();
      addNegativeKeywordToAdGroup(campaigns, keyword.getText(), keyword.getAdGroup().getName(), keyword.getCampaign().getName());      
    }
  }
}

function addNegativeKeywordToAdGroup(campaigns, keyword, currentAdGroup, currentCampaign) {
  // add keywords to all other campaigns
  // exclude current campaign
  // exclude possible long tail campaigns based on this one
  
  var shortTailExclusion = currentAdGroup || currentAdGroup.match(/\-.*$/g)[0];
  
    var adGroupIterator = AdsApp.adGroups()
      .withCondition('Name != "' + currentAdGroup + '"')
      .withCondition('Name DOES_NOT_CONTAIN_IGNORE_CASE "' + shortTailExclusion + '"')
      .withCondition('Status != REMOVED')    
      .withCondition('CampaignStatus != REMOVED')
      .withCondition('CampaignName CONTAINS "' + campaigns + '"')   
      .get();
  if (adGroupIterator.hasNext()) {
    var adGroup = adGroupIterator.next();
    appendARow(currentCampaign, currentAdGroup, keyword, adGroup.getCampaign().getName(), adGroup.getName());
    adGroup.createNegativeKeyword(keyword);
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
