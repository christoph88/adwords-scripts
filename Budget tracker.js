function main() {
  function getBudgetDetails() {
    var campaignIterator = AdWordsApp.campaigns()
        //.withCondition('Name CONTAINS "_B_"')
        .get();
    while (campaignIterator.hasNext()) {
      var campaign = campaignIterator.next();
      var budget = campaign.getBudget();
      var budgetCampaignIterator = budget.campaigns().get();

      Logger.log('Budget amount : ' + budget.getAmount());
      Logger.log('Delivery method : ' + budget.getDeliveryMethod());
      Logger.log('Explicitly shared : ' + budget.isExplicitlyShared());
      Logger.log('Associated campaigns : ' +
          budgetCampaignIterator.totalNumEntities());
      Logger.log('Details');
      Logger.log('=======');

      // Get all the campaigns associated with this budget. There could be
      // more than one campaign if this is a shared budget.

      while (budgetCampaignIterator.hasNext()) {
        var associatedCampaign = budgetCampaignIterator.next();
        Logger.log(associatedCampaign.getName());
      }
    }
  }

  getBudgetDetails();
}
