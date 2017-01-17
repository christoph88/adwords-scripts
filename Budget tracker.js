function main() {
   // config
   var account = AdWordsApp.currentAccount().getName();
   var spreadsheeturl = 'https://docs.google.com/spreadsheets/d/1wxB3LdCzI3xdxhZxDNzdNRHOUzfadoeTWiFbjhVUVQs/edit#gid=0'
   
   // code
   var ss = SpreadsheetApp.openByUrl(spreadsheeturl);

   var sheet = ss.getSheets()[0];
   Logger.log(ss.getName());
   Logger.log(sheet);


  function getBudgetDetails() {
    var campaignIterator = AdWordsApp.campaigns()
        .withCondition('Status = ENABLED')
        .get();
    while (campaignIterator.hasNext()) {
      var campaign = campaignIterator.next();
      var budget = campaign.getBudget();
      var budgetCampaignIterator = budget.campaigns().get();
      var stats = campaign.getStatsFor('YESTERDAY');

      var date = new Date();
      date.setDate(date.getDate() - 1);

      Logger.log('Associated campaigns : ' + campaign.getName());
      Logger.log('===NEXT===');

      // append a row to the defined spreadsheet
      sheet.appendRow([
        account,
        date, 
        campaign.getName(), 
        budget.getAmount(), 
        stats.getCost(), 
        stats.getCost()/budget.getAmount(),
        budget.getDeliveryMethod(), 
        budget.isExplicitlyShared(), 
        budgetCampaignIterator.totalNumEntities()
        ]);

    }
  }

  getBudgetDetails();
}
