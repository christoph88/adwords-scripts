function main() {

   var ss = SpreadsheetApp.openByUrl(
       'https://docs.google.com/spreadsheets/d/1wxB3LdCzI3xdxhZxDNzdNRHOUzfadoeTWiFbjhVUVQs/edit#gid=0');

   var sheet = ss.getSheets()[0];
   Logger.log(ss.getName());
   Logger.log(sheet);

  function getBudgetDetails() {
    var campaignIterator = AdWordsApp.campaigns()
        //.withCondition('Name CONTAINS "_B_"')
        .get();
    while (campaignIterator.hasNext()) {
      var campaign = campaignIterator.next();
      var budget = campaign.getBudget();
      var budgetCampaignIterator = budget.campaigns().get();

      Logger.log('Associated campaigns : ' +
                 campaign.getName());
      Logger.log('Budget amount : ' + budget.getAmount());
      Logger.log('Delivery method : ' + budget.getDeliveryMethod());
      Logger.log('Explicitly shared : ' + budget.isExplicitlyShared());
      Logger.log('Associated campaigns : ' +
          budgetCampaignIterator.totalNumEntities());
      var stats = campaign.getStatsFor('YESTERDAY');
      Logger.log(stats.getCost() + ' cost');
      Logger.log('===NEXT===');

      // append a row to the defined spreadsheet
      sheet.appendRow([campaign.getName(), budget.getAmount(), stats.getCost(), budget.getDeliveryMethod(), budget.isExplicitlyShared(), budgetCampaignIterator.totalNumEntities()]);

    }
  }

  getBudgetDetails();
}
