// script to rename all adgroups of labelled acounts at once
// log to this spreadsheet
var SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1KzxwSwHKTrHLC4uTpvbubcsOPOHsut95EpjyGYU99mA/edit#gid=0';
// Name of the specific sheet in the spreadsheet.
var SHEET_NAME = 'log';

function updateAccountsInSeries() {
  // You can use this approach when you have only minimal processing to
  // perform in each of your client accounts.
  
  // clear current log
  clearSheetData();
  
  // Select the accounts to be processed.
  var accountIterator = MccApp.accounts()
      .withCondition("LabelNames CONTAINS 'BE'")
      .get();

  // Save the MCC account, to switch back later.
  var mccAccount = AdWordsApp.currentAccount();
    
  appendARow(['Campaign', 'Adgroup', 'New Adgroup']);
  
  // config
  var findThis = /^./i;
  var replaceWith = "";
  
    while (accountIterator.hasNext()) {
      var account = accountIterator.next();

      // Switch to the account you want to process.
      MccApp.select(account);

    // AdWordsApp.adGroups() will return all ad groups that are not removed by
    // default.
    var adGroupIterator = AdWordsApp.adGroups()
    .withCondition("Status != REMOVED")
    .withCondition("CampaignStatus != REMOVED")
    .withCondition('CampaignName DOES_NOT_CONTAIN _DSR_')
    .withCondition('CampaignName DOES_NOT_CONTAIN _DST_')
    .withCondition('CampaignName DOES_NOT_CONTAIN _YT_')
    .withCondition('CampaignName DOES_NOT_CONTAIN _DSA_')
    //.withCondition('Name CONTAINS "Branding"')
    .get();

      while (adGroupIterator.hasNext()) {
        var adGroup = adGroupIterator.next();
        
        // get the campaignname for this adgroup just for info
        var campaignName = adGroup.getCampaign().getName();
        
        // define how the new name should be formatted
        var newName = adGroup.getName().replace(findThis, replaceWith);
        
        // new adgroup structure for merge
        //var matchTypeRegEx = /[A-Z]*$/;
        //var matchType = matchTypeRegEx.exec(campaignName);
        
      //var groupRemove = /(CP|SP|VN)_(BEFR|BENL)_(B|NB|DSR|DST|YT|UAC)(_(PARK|DSA|DYNAMIC_X|GMAIL|TEST))?(_(COUNTRY|LASTMINUTE|PROMO|REGION|ACTIVITY|SEASONAL|CITY|TARGET|EVENTS|ATTRACTION|DURATION|HOLIDAY|DEPARTMENT|ACCOMMODATION|BRANDING))?/i;
        //var groupRemove2 = /(_MBM|_EXACT)$/i;
        
        //var group = campaignName.replace(groupRemove,'').replace(groupRemove2,'');
                
        //var newName = matchType[0].toUpperCase() + group.toUpperCase() + ' # ' + adGroup.getName();
        
        Logger.log(newName);
        
    
        if ( adGroup.getName() != newName ) {
          // do a log before making the change
          appendARow([campaignName, adGroup.getName(), newName]);
          // set new campaign names by replacing current name using a regex.
          adGroup.setName(newName);

          
        }
      }
    }
  
}

function clearSheetData() {


  var ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
  var sheet = ss.getSheetByName(SHEET_NAME);
  sheet.clearContents();
}

function appendARow(rowArray) {

  var ss = SpreadsheetApp.openByUrl(SPREADSHEET_URL);
  var sheet = ss.getSheetByName(SHEET_NAME);

  // Appends a new row with 3 columns to the bottom of the
  // spreadsheet containing the values in the array.
  sheet.appendRow(rowArray);
}

function main() {
  updateAccountsInSeries();
}

