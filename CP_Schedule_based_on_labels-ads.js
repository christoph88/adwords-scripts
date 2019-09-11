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
  




    /**************************************************
     * Pause or Enable Campaigns, Keywords or Ads on a Given Date
     * Version 1.2
     * Changelog v1.2 - Added ability to pause Campaigns
     * Changelog v1.1 - Added ability to run on Ads
     * Created By: Russ Savage
     * FreeAdWordsScripts.com
     **************************************************/
    var ENTITY = 'Ad'; //or Ad or Campaign
    var PAUSE_PREFIX = "Pause on "; //look for labels "Pause on 2013-04-11"
    var ENABLE_PREFIX = "Enable on "; //look for labels "Enable on 2013-04-11"


    function checkEntities() {
      var todayStr = Utilities.formatDate(new Date(), AdWordsApp.currentAccount().getTimeZone(), "yyyy-MM-dd");
      var pauseStr = PAUSE_PREFIX+todayStr;
      var enableStr = ENABLE_PREFIX+todayStr;
      Logger.log("Looking for labels: " + [pauseStr,enableStr].join(' and '));

      var labelsArray = buildLabelArray(pauseStr,enableStr);

      if(labelsArray.length > 0) { 
        var labelsStr = "['" + labelsArray.join("','") + "']";
        var entityIter;
        if(ENTITY === 'Keyword') {
          entityIter = AdWordsApp.keywords().withCondition("LabelNames CONTAINS_ANY "+labelsStr).get();
        } else if(ENTITY === 'Ad') {
          entityIter = AdWordsApp.ads().withCondition("LabelNames CONTAINS_ANY "+labelsStr).get();
        } else if(ENTITY === 'Campaign') {
          entityIter = AdWordsApp.campaigns().withCondition("LabelNames CONTAINS_ANY "+labelsStr).get();
        } else {
          throw 'Invaid ENTITY type. Should be Campaign, Keyword or Ad. ENTITY:'+ENTITY;
        }

        while(entityIter.hasNext()) {
          var entity = entityIter.next();
          pauseEntity(entity, pauseStr);
          enableEntity(entity, enableStr);
        }
      }
    }



    //Helper function to build a list of labels in the account
    function buildLabelArray(pauseStr,enableStr) {
      var labelsArray = [];
      try {
        var labelIter = AdWordsApp.labels().withCondition("Name IN ['"+pauseStr+"','"+enableStr+"']").get();
        while(labelIter.hasNext()) {
          labelsArray.push(labelIter.next().getName());
        }
        return labelsArray;
      } catch(e) {
        Logger.log(e);
      }
      return [];
    }

    //Helper function to pause entities
    function pauseEntity(entity, pauseStr) {
      var labelIter = entity.labels().withCondition("Name = '"+pauseStr+"'").get();
      if(labelIter.hasNext()) {
        entity.pause();
        entity.removeLabel(pauseStr);
      }
    }

    //Helper function to enable entities
    function enableEntity(entity, enableStr) {
      var labelIter = entity.labels().withCondition("Name = '"+enableStr+"'").get();
      if(labelIter.hasNext()) {
        entity.enable();
        entity.removeLabel(enableStr);
      }
    }




    checkEntities()  
    
        
  }
}
