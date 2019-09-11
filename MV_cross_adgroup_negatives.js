/*
Get all ad groups
Label all adgroups
Convert the ad group names to keywords
Create an object with adgroups and all negatives
Filter short tail negatives
Push negatives to adgroup
Remove adgroup label
Check if any labels are still present, rinse and repeat.

*/

// GLOBAL VARIABLES

var adgroups = {};
var labelName = 'script - cankw';
var resumeRun = resumeRun();

// MAIN

function main() {
  //removeNegativeKeywordsFromAdGroups();
  Logger.log('check https://docs.google.com/spreadsheets/d/1Db6uwMTHTEJrCeiuXoSnMW7v93KQ9KvgvryUBrQlUVk/edit#gid=0'); 
  
  if (!resumeRun) {
    resetSheet();
    createLabel();
    removeNegativeKeywordsFromAdGroups()
  }
  
  // add function to remove the "to add keyword from all adgroups:.
  // if label does not exist add specific label to all adgroups, if exists filter campaigns on that label for adding negatives
  getAdGroupData();
}



// HELPERS

function adgroupToNegativeMBM(adgroup) {
  return '+'+ adgroup.replace(/\w+\#\w+ - /,'').replace(/( \- | )/g,' +');
}

function escapeRegExp(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
}

function createLabel(){
  AdsApp.createLabel(labelName, 'cross account negatives label', 'grey')
}

function resumeRun() {
  try {
   var totalLabelsAdded = AdsApp.adGroups()
      .withCondition("LabelNames CONTAINS_ALL ['" + labelName + "']")
      .get().totalNumEntities();
 
  return totalLabelsAdded > 0;
  } catch(err) { 
    Logger.log(err);
    return false; 
  }
}


function appendARow(campaign, adgroup, keyword) {
  var SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1Db6uwMTHTEJrCeiuXoSnMW7v93KQ9KvgvryUBrQlUVk/edit#gid=0';
  // Name of the specific sheet in the spreadsheet.
  var SHEET_NAME = 'data';

  var ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
  var sheet = ss.getSheetByName(SHEET_NAME);
 
  
  // append rows
  sheet.appendRow([new Date(),campaign, adgroup, '="' + keyword + '"']);
}

function resetSheet() {
  var SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1Db6uwMTHTEJrCeiuXoSnMW7v93KQ9KvgvryUBrQlUVk/edit#gid=0';
  // Name of the specific sheet in the spreadsheet.
  var SHEET_NAME = 'data';

  var ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
  var sheet = ss.getSheetByName(SHEET_NAME);
 
  sheet.clear();
  // append rows
  sheet.appendRow(['timestamp','campaign', 'adGroup', 'negative']);
 
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



// MAIN FUNCTIONS

function getAdGroupData() {  

  
  Logger.log('push adgroup data to object');
    var adgroupIterator = AdsApp.adGroups()
      .withCondition('AdGroupStatus != REMOVED')    
      .withCondition('CampaignStatus != REMOVED')
      .withCondition('CampaignName CONTAINS "_Search_"'  )
      .get();
  
  Logger.log(adgroupIterator.totalNumEntities());
  
  if (adgroupIterator.hasNext()) {
    while (adgroupIterator.hasNext()) {
      var adgroup = adgroupIterator.next();
      adgroups[adgroup.getId()] = {};
      adgroups[adgroup.getId()]['name'] = adgroup.getName();
      adgroups[adgroup.getId()]['keyword'] = adgroupToNegativeMBM(adgroup.getName());
      adgroups[adgroup.getId()]['negatives'] = [];
      
      if (!resumeRun) {
        adgroup.applyLabel(labelName);
      }
      
    }
  }
  
  //Logger.log(adgroups);
  processAdGroups();
}

function processAdGroups() {
  Logger.log('Loop through ad groups');
  Logger.log('Push negative keywords per adgroup to object');

  for (var i = 0; i < Object.keys(adgroups).length; i++) {
    var adgroupId = Object.keys(adgroups)[i];
    var adgroupKeyword = adgroups[adgroupId].keyword;
    
    addToAdgroupNegatives(adgroupId, adgroupKeyword);

  }
  pushNegativesToAds();
}


function addToAdgroupNegatives(currentAdgroupId, currentAdgroupKeyword) {
  
  // add the negative keyword to all relevant adgroups
  for (var i = 0; i < Object.keys(adgroups).length; i++) {
    var adgroupId = Object.keys(adgroups)[i];
    var adgroupNegatives = adgroups[adgroupId].negatives;
    
    if (currentAdgroupId !== adgroupId) {
      adgroupNegatives.push(currentAdgroupKeyword);
    }
    
  }
}



function pushNegativesToAds() {
  
  Logger.log('get negatives from object and push them to the adgroups');
  
  var adgroupIterator = AdsApp.adGroups()
      .withCondition("LabelNames CONTAINS_ALL ['" + labelName + "']")
      .get();
  
  Logger.log(adgroupIterator.totalNumEntities() + ' ad groups to process');
  
  if (adgroupIterator.hasNext()) {
    while (adgroupIterator.hasNext()) {
      var adgroup = adgroupIterator.next();      
      var adgroupId = adgroup.getId();
      
      // add negatives to adgroup > getnegativesexcluding adgroup
      if (adgroups[adgroupId]) {
        
        var name = adgroups[adgroupId].name;
        var negatives = adgroups[adgroupId].negatives;

        Logger.log('Processing - ' + name);
        Logger.log(negatives.length);
        
        for (var i = 0; i < negatives.length; i++) {
          var negative = negatives[i];
          
          // check if negative is short tail
          var cleanNeg = negative.replace(/(\+|\*)/g,'');
          var cleanName = name.replace(/(\w+\#\w+ - )/g,'');

          // check if negative words are in adgroup name
          // in any order
          var CleanNegRegEx = '^';        
          var cleanNegs = cleanNeg.split(' ');
          for (var i = 0; i < cleanNegs.lenght; i++){
            var neg = cleanNegs[i];
            CleanNegRegEx += '(?=.*\b' + neg + '\b)';
          }
          CleanNegRegEx += '.*$';
          
          var shortTail = name.match(new RegExp(CleanNegRegEx));
          
          // if negative keywords in adgroup then don't exclude
          // if they aren't found add negative
          if (shortTail == null){
            appendARow(adgroup.getCampaign().getName(), adgroup.getName(), negative);
            adgroup.createNegativeKeyword(negative);          
          }
          

        } 
      }
      Logger.log('remove label from ' + name);
      adgroup.removeLabel(labelName);
    }
  }

}




