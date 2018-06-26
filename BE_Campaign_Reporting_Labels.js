function updateAccountsInSeries() {
  // You can use this approach when you have only minimal processing to
  // perform in each of your client accounts.
  
  // Select the accounts to be processed.
  var accountIterator = MccApp.accounts()
      .withCondition('LabelNames CONTAINS "VNBE"')
      //.withCondition('LabelNames CONTAINS "BEFR"')
      .get();
  
  // Save the MCC account, to switch back later.
  var mccAccount = AdWordsApp.currentAccount();

  while (accountIterator.hasNext()) {
    var account = accountIterator.next();

    // Switch to the account you want to process.
    MccApp.select(account);

    // Retrieve all campaigns to be processed.
    var campaignIterator = AdWordsApp.campaigns()
      .withCondition('Name CONTAINS "_B_"')
      .get();

    while (campaignIterator.hasNext()) {
      var campaign = campaignIterator.next();
      var campaignName = campaign.getName();
      
      campaign.applyLabel('Branded test label');
    }
  }
}

function main() {
  updateAccountsInSeries()
}
