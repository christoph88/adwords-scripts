function main() {

  // Select the accounts to be processed.
  var accountIterator = MccApp.accounts()
      .withCondition("LabelNames CONTAINS 'BE'")
      .get();

  // Save the MCC account, to switch back later.
  var mccAccount = AdWordsApp.currentAccount();

  while (accountIterator.hasNext()) {
    var account = accountIterator.next();

    // Switch to the account you want to process.
    MccApp.select(account);
  




/*********************************************
* Update Keywords for the New Year
* Version 1.1
* Changelog v1.1
*   - Updated for speed and added comments 
* Created By: Russ Savage
* FreeAdWordsScripts.com
**********************************************/
function checkEntities() {
  var sameDayLastYear = new Date();
  sameDayLastYear.setYear(sameDayLastYear.getYear()-1);
  var oldYearStr = sameDayLastYear.getYear().toString();
  var newYearStr = new Date().getYear().toString();
   
  Logger.log('Updating keywords with old year: '+oldYearStr+' to new year: '+newYearStr);
   
  // Let's start by getting all of the keywords
  var kwIter = AdWordsApp.keywords()
    .withCondition("Text CONTAINS " + oldYearStr)
    .withCondition("Status = ENABLED")
    .withCondition("AdGroupStatus = ENABLED")
    .withCondition("CampaignStatus = ENABLED")
    .get();
  
  // It is always better to store and batch process afterwards
  var toPause = [];
  var toCreate = [];
  while (kwIter.hasNext()) {
    var kw = kwIter.next();
    var ag = kw.getAdGroup();
    var oldText = kw.getText();
    var newText = oldText.replace(oldYearStr,newYearStr);
    // Save the info so that we can create them as a batch later
    toCreate.push({ ag: ag, text: newText, cpc:kw.getMaxCpc() });
    // Same with the ones we want to pause
    toPause.push(kw) 
  }
  // Now we create the new keywords all at once
  for(var i in toCreate) {
    var elem = toCreate[i];
    elem.ag.newKeywordBuilder().withText(elem.text).withCpc(elem.cpc).build();
  }
  // And pause the old ones all at once
  for(var i in toPause) {
    toPause[i].pause();
    //or toPause[i].remove(); to delete the old keyword
  }
}




    checkEntities()  
    
        
  }
}
