function getAccountReport() {
  // You can use this approach when you have only minimal processing to
  // perform in each of your client accounts.

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

    var report = AdWordsApp.report(
      'SELECT AccountCurrencyCode ,AccountDescriptiveName ,AccountTimeZoneId ,AdGroupId ,AdGroupName ,AdGroupStatus ,AllConversionValue ,AllConversions ,ApprovalStatus ,AverageCpm ,AverageCpv ,AveragePageviews ,AveragePosition ,AverageTimeOnSite ,BaseAdGroupId ,BaseCampaignId ,BiddingStrategyId ,BiddingStrategyName ,BiddingStrategySource ,BiddingStrategyType ,CampaignId ,CampaignName ,CampaignStatus ,ClickAssistedConversionValue ,ClickAssistedConversionsOverLastClickConversions ,ClickType ,Clicks ,ConversionCategoryName ,ConversionRate ,ConversionTrackerId ,ConversionTypeName ,ConversionValue ,Conversions ,Cost ,CostPerAllConversion ,CostPerConversion ,CpcBid ,CpcBidSource ,CriteriaDestinationUrl ,CrossDeviceConversions ,Ctr ,CustomerDescriptiveName ,Date ,DayOfWeek ,Device ,Engagements ,EnhancedCpcEnabled ,ExternalCustomerId ,FinalAppUrls ,FinalMobileUrls ,FinalUrls ,FirstPageCpc ,FirstPositionCpc ,GmailForwards ,GmailSaves ,GmailSecondaryClicks ,HasQualityScore ,ImpressionAssistedConversionValue ,ImpressionAssistedConversionsOverLastClickConversions ,Impressions ,InteractionRate ,InteractionTypes ,Interactions ,IsNegative ,Labels ,Month ,MonthOfYear ,PercentNewVisitors ,PostClickQualityScore ,Quarter ,SearchExactMatchImpressionShare ,SearchImpressionShare ,SearchPredictedCtr ,Slot ,SystemServingStatus ,TrackingUrlTemplate ,UrlCustomParameters ,ValuePerAllConversion ,ValuePerConversion ,VideoQuartile100Rate ,VideoQuartile25Rate ,VideoQuartile50Rate ,VideoQuartile75Rate ,VideoViewRate ,VideoViews ,ViewThroughConversions ,Week ,Year ' +
      'FROM   KEYWORDS_PERFORMANCE_REPORT ' +
      'DURING YESTERDAY');

    var accountName = AdWordsApp.currentAccount().getName();
    var spreadsheet = SpreadsheetApp.create(accountName + " Quality Score Report");
    //var spreadsheet = SpreadsheetApp.openByUrl('http://www.spreadsheeturl.bla');

    var sheet = spreadsheet.getActiveSheet();
    var rows = report.rows();
    
    while (rows.hasNext()) {
      var row = rows.next();
      
      sheet.appendRow([
        accountName
        ,row.Criteria
        ,row.AccountCurrencyCode
        ,row.AccountDescriptiveName
        ,row.AccountTimeZoneId
        ,row.ActiveViewCpm
        ,row.ActiveViewCtr
        ,row.ActiveViewImpressions
        ,row.ActiveViewMeasurability
        ,row.ActiveViewMeasurableCost
        ,row.ActiveViewMeasurableImpressions
        ,row.ActiveViewViewability
        ,row.AdGroupId
        ,row.AdGroupName
        ,row.AdGroupStatus
        ,row.AllConversionValue
        ,row.AllConversions
        ,row.ApprovalStatus
        ,row.AverageCpm
        ,row.AverageCpv
        ,row.AveragePageviews
        ,row.AveragePosition
        ,row.AverageTimeOnSite
        ,row.BaseAdGroupId
        ,row.BaseCampaignId
        ,row.BiddingStrategyId
        ,row.BiddingStrategyName
        ,row.BiddingStrategySource
        ,row.BiddingStrategyType
        ,row.CampaignId
        ,row.CampaignName
        ,row.CampaignStatus
        ,row.ClickAssistedConversionValue
        ,row.ClickAssistedConversionsOverLastClickConversions
        ,row.ClickType
        ,row.Clicks
        ,row.ConversionCategoryName
        ,row.ConversionRate
        ,row.ConversionTrackerId
        ,row.ConversionTypeName
        ,row.ConversionValue
        ,row.Conversions
        ,row.Cost
        ,row.CostPerAllConversion
        ,row.CostPerConversion
        ,row.CpcBid
        ,row.CpcBidSource
        ,row.CriteriaDestinationUrl
        ,row.CrossDeviceConversions
        ,row.Ctr
        ,row.CustomerDescriptiveName
        ,row.Date
        ,row.DayOfWeek
        ,row.Device
        ,row.Engagements
        ,row.EnhancedCpcEnabled
        ,row.ExternalCustomerId
        ,row.FinalAppUrls
        ,row.FinalMobileUrls
        ,row.FinalUrls
        ,row.FirstPageCpc
        ,row.FirstPositionCpc
        ,row.GmailForwards
        ,row.GmailSaves
        ,row.GmailSecondaryClicks
        ,row.HasQualityScore
        ,row.ImpressionAssistedConversionValue
        ,row.ImpressionAssistedConversionsOverLastClickConversions
        ,row.Impressions
        ,row.InteractionRate
        ,row.InteractionTypes
        ,row.Interactions
        ,row.IsNegative
        ,row.Labels
        ,row.Month
        ,row.MonthOfYear
        ,row.PercentNewVisitors
        ,row.PostClickQualityScore
        ,row.Quarter
        ,row.SearchExactMatchImpressionShare
        ,row.SearchImpressionShare
        ,row.SearchPredictedCtr
        ,row.Slot
        ,row.SystemServingStatus
        ,row.TrackingUrlTemplate
        ,row.UrlCustomParameters
        ,row.ValuePerAllConversion
        ,row.ValuePerConversion
        ,row.VideoQuartile100Rate
        ,row.VideoQuartile25Rate
        ,row.VideoQuartile50Rate
        ,row.VideoQuartile75Rate
        ,row.VideoViewRate
        ,row.VideoViews
        ,row.ViewThroughConversions
        ,row.Week
        ,row.Year

      ]);

    }
    
    Logger.log("Finished");

  }
}

function main() {
  getAccountReport()
}
