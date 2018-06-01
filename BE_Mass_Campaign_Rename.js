// log to this spreadsheet
var SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/13yEIQYdiTlVVKySrgtidp_UNosy41zjZ6iZxP1DG8XA/edit#gid=0';
// Name of the specific sheet in the spreadsheet.
var SHEET_NAME = 'log';

function updateAccountsInSeries() {
  // You can use this approach when you have only minimal processing to
  // perform in each of your client accounts.
  
  // clear current log
  clearSheetData();

  // Select the accounts to be processed.
  var accountIterator = MccApp.accounts()
      .withCondition('LabelNames CONTAINS "VNBE"')
  	  .withCondition('LabelNames CONTAINS "BEFR"')
      .get();
  
  appendARow(['Campaign', 'New Campaign', 'Conversions', 'Clicks']);
  
  // config
  var findThis = /_HOLIDAY_GENERAL_/i;
  var replaceWith = "_HOLIDAY_";

  // Save the MCC account, to switch back later.
  var mccAccount = AdWordsApp.currentAccount();

  while (accountIterator.hasNext()) {
    var account = accountIterator.next();

    // Switch to the account you want to process.
    MccApp.select(account);

    // Retrieve all campaigns to be processed.
    var campaignIterator = AdWordsApp.campaigns()
    	.withCondition('Status != REMOVED')
        .withCondition('Name DOES_NOT_CONTAIN "_DSR_"')
    	.withCondition('Name DOES_NOT_CONTAIN "_DST_"')
    	.withCondition('Name DOES_NOT_CONTAIN "_DSA_"')
    	.withCondition('Name DOES_NOT_CONTAIN "_YT_"')
     	.forDateRange("LAST_30_DAYS")
    	.orderBy("Conversions DESC") 	
    	.orderBy("Clicks DESC")
        .get();

    while (campaignIterator.hasNext()) {
      var campaign = campaignIterator.next();
      var campaignName = campaign.getName();
      
      // define new campaign name
      //var campaignNewName = campaign.getName().replace(findThis, replaceWith);
      
      // preparation for the merge
      var groupRegEx = /((CP|SP|VN)_(BEFR|BENL)_(B|NB|DSR|DST|YT|UAC)(_(PARK|DSA|DYNAMIC_X|GMAIL|TEST))?(_(COUNTRY|LASTMINUTE|PROMO|REGION|ACTIVITY|SEASONAL|CITY|TARGET|EVENTS|ATTRACTION|DURATION|HOLIDAY|DEPARTMENT|ACCOMMODATION|BRANDING))?)/i;
      var campaignNewName = groupRegEx.exec(campaignName)[0].toUpperCase();
      
      
      
      // use preview to test!
      Logger.log(campaignNewName);
      appendARow([campaignName, campaignNewName, campaign.getStatsFor('LAST_30_DAYS').getConversions(), campaign.getStatsFor('LAST_30_DAYS').getClicks()]);
      // set new campaign names by replacing current name using a regex.
      campaign.setName(campaignNewName);
      
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
  updateAccountsInSeries()
}
