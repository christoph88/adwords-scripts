function updateAccountsInSeries() {
    You can use this approach when you have only minimal processing to
    // perform in each of your client accounts. 

    // Select the accounts to be processed. 
    var accountIterator = MccApp.accounts()
        .withCondition('LabelNames CONTAINS "BE"')
        //.withCondition('LabelNames CONTAINS "BEFR"') 
        .get();

    // Save the MCC account, to switch back later. 
    var mccAccount = AdWordsApp.currentAccount();


    while (accountIterator.hasNext()) {
        var account = accountIterator.next();
        // Switch to the account you want to process. 
        MccApp.select(account);

        var labelInfo =
            [{
                filter: '_B_',
                label: 'CG_01_B'
            }, {
                filter: '_NB_',
                label: 'CG_01_NB'
            }, {
                filter: '_DSR_',
                label: 'CG_01_DSR'
            }, {
                filter: '_DST_',
                label: 'CG_01_DST'
            }, {
                filter: '_YT_',
                label: 'CG_01_YT'
            }, {
                filter: '_UAC_',
                label: 'CG_01_UAC'
            }, {
                filter: '_DSA_',
                label: 'CG_01_DSA'
            }, {
                filter: '_COUNTRY_',
                label: 'CG_02_COUNTRY'
            }, {
                filter: '_LASTMINUTE_',
                label: 'CG_02_LASTMINUTE'
            }, {
                filter: '_PROMO_',
                label: 'CG_02_PROMO'
            }, {
                filter: '_REGION_',
                label: 'CG_02_REGION'
            }, {
                filter: '_ACTIVITY_',
                label: 'CG_02_ACTIVITY'
            }, {
                filter: '_SEASONAL_',
                label: 'CG_02_SEASONAL'
            }, {
                filter: '_CITY_',
                label: 'CG_02_CITY'
            }, {
                filter: '_TARGET_',
                label: 'CG_02_TARGET'
            }, {
                filter: '_EVENTS_',
                label: 'CG_02_EVENTS'
            }, {
                filter: '_ATTRACTION_',
                label: 'CG_02_ATTRACTION'
            }, {
                filter: '_DURATION_',
                label: 'CG_02_DURATION'
            }, {
                filter: '_HOLIDAY_',
                label: 'CG_02_HOLIDAY'
            }, {
                filter: '_DEPARTMENT_',
                label: 'CG_02_DEPARTMENT'
            }, {
                filter: '_ACCOMMODATION_',
                label: 'CG_02_ACCOMMODATION'
            }, {
                filter: '_BRANDING_',
                label: 'CG_02_BRANDING'
            }, {
                filter: '_PARK_',
                label: 'CG_02_PARK'
            }];

        // iterate trough labelinfo array   
        for (var i = 0; i < labelInfo.length; i++) {
            // Retrieve all campaigns to be processed. 
            var campaignIterator = AdWordsApp.campaigns()
                .withCondition('Name CONTAINS "' + labelInfo[i].filter + '"')
                .get();

            createLabelIfNeeded(labelInfo[i].label);

            while (campaignIterator.hasNext()) {
                var campaign = campaignIterator.next();
                var campaignName = campaign.getName();

                Logger.log(campaignName + ' > ' + labelInfo[i].label);
                campaign.applyLabel(labelInfo[i].label);
            }
        }
    }
}

function createLabelIfNeeded(name) {
    if (!AdWordsApp.labels().withCondition("Name = '" + name + "'").get().hasNext()) {
        AdWordsApp.createLabel(name);
    }
}

function main() {
    updateAccountsInSeries()
}
