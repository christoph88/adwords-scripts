function main(){
  
  // sync exact match keywords as broad match with account level negative keyword list
  // 'account_keywords - _B_' with NB
  // 'account_keywords - _competition' with NB non competition
  // auto add these lists to the proper campaigns
  processLists();
}

function processLists() {
  
  // get all _NB_ campaigns
  var campaigns = AdsApp.campaigns()
  .withCondition('Name CONTAINS "_NB_"')
  .get();
  
  // add _B_ nkw to all _NB_ campaigns
  while (campaigns.hasNext()) {
   var campaign = campaigns.next(); 
   campaign.addNegativeKeywordList(AdsApp.negativeKeywordLists().withCondition('Name = "account_keywords - _B_"').get().next());
  }
  // add relevant keywords to list
  addKeywordsToList('account_keywords - _B_', getKeywords('account_keywords - _B_'));
  
  // get all NB non competition campaigns
  var campaigns = AdsApp.campaigns()
  .withCondition('Name CONTAINS "_NB_"')
  .withCondition('Name DOES_NOT_CONTAIN "_competition"')
  .get();
  
  // add competition nkw to these campaigns
  while (campaigns.hasNext()) {
   var campaign = campaigns.next(); 
   campaign.addNegativeKeywordList(AdsApp.negativeKeywordLists().withCondition('Name = "account_keywords - _competition"').get().next());
  }
  
  // add competitor keywords to nkw list
  addKeywordsToList('account_keywords - _competition', getKeywords('account_keywords - _competition'));  
  
}

function addKeywordsToList(negativeKeywordList, keywordTexts) {
   var negativeKeywordListSelector = AdsApp.negativeKeywordLists()
     .withCondition("Name = '" + negativeKeywordList + "'")
 var negativeKeywordListIterator = negativeKeywordListSelector.get();
 

 while (negativeKeywordListIterator.hasNext()) {
   var negativeKeywordList = negativeKeywordListIterator.next();
   Logger.log(negativeKeywordList.getName());
   Logger.log(keywordTexts);
   negativeKeywordList.addNegativeKeywords(keywordTexts);
 }
}

function getKeywords(list) {

  var report = null;
  if (list == 'account_keywords - _B_'){
    var report = AdsApp.report(
    "SELECT Criteria " +
    "FROM   KEYWORDS_PERFORMANCE_REPORT " +
    "WHERE  CampaignName CONTAINS '_B_' and KeywordMatchType = 'EXACT' " +
    "DURING LAST_7_DAYS");
  }
  
    if (list == 'account_keywords - _competition'){
    var report = AdsApp.report(
    "SELECT Criteria " +
    "FROM   KEYWORDS_PERFORMANCE_REPORT " +
    "WHERE  CampaignName CONTAINS '_competition' and KeywordMatchType = 'EXACT' " +
    "DURING LAST_7_DAYS");
  }
  
  var rows = report.rows();
  var keywordTexts = [];
  while (rows.hasNext()) {
      var row = rows.next();
      var criteria = row["Criteria"];
      //Logger.log(criteria);
      keywordTexts.push(criteria);
    }
  return keywordTexts;
}
