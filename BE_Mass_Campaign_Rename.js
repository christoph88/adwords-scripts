function updateAccountsInSeries() {
  // You can use this approach when you have only minimal processing to
  // perform in each of your client accounts.

  // Select the accounts to be processed.
  var accountIterator = MccApp.accounts()
      //.withCondition("LabelNames CONTAINS 'BE'")
      .withIds([
        //'665-'
        //,'314-'
      ])
      .get();

  // Save the MCC account, to switch back later.
  var mccAccount = AdWordsApp.currentAccount();

  while (accountIterator.hasNext()) {
    var account = accountIterator.next();

    // Switch to the account you want to process.
    MccApp.select(account);

    // Retrieve all campaigns to be paused.
    var campaignIterator = AdWordsApp.campaigns()
        //.withCondition("Name CONTAINS 'Season'")
        .get();

    while (campaignIterator.hasNext()) {
      var campaign = campaignIterator.next();
      
      // post info to logs
      Logger.log('campaign %s to %s\nin account %s - %s'
                 , campaign.getName(), campaign.getName().replace(/_ /i, "_"),
                 account.getCustomerId(), account.getName()
                );
      
      // set new campaign names by replacing current name using a regex.
      campaign.setName(campaign.getName().replace(/^BE(NL|FR)_/i, campaign.getName().substring(0,4) + "_VN_"));
    }
  }
}

function main() {
  updateAccountsInSeries()
}
