// rerun after account structure changes - keywords, adgroups, campaign
// do this by removing following label from the ad-groups
// script creates negative keywords based on the adgroup name of excluded adgroups.
// excluded adgroups 1= current adgroup
// excluded adgroups = (current adgroup minus the last word) > group on that string
// alls base names are set as negative if not matches with the base name of current adgroup.
var labelName = 'cross-adgroup-negatives-added';

function main() {
  getAdGroups();
}



function removeNegativeKeywordsFromAdGroup(id) {
  // If you have multiple ad groups with the same name, this snippet will
  // pick an arbitrary matching ad group each time. In such cases, just
  // filter on the campaign name as well:
  //
  // AdsApp.adGroups()
  //     .withCondition('Name = "INSERT_ADGROUP_NAME_HERE"')
  //     .withCondition('CampaignName = "INSERT_CAMPAIGN_NAME_HERE"')
  
  var adGroupIterator = AdsApp.adGroups()
      .withIds(id)
      .get();
  if (adGroupIterator.hasNext()) {
    var adGroup = adGroupIterator.next();
    Logger.log('removing current negatives from ' + adGroup.getName());
    var negativeKeywordIterator = adGroup.negativeKeywords().get();
    while (negativeKeywordIterator.hasNext()) {
      var negativeKeyword = negativeKeywordIterator.next();
      negativeKeyword.remove();
    }
  }
}

function getAdGroups() {  
  Logger.log('Get all adgroups for search');
  // exclude already done ad groups - with a label

  try {
    var adgroupIterator = AdsApp.adGroups()
      .withCondition('AdGroupStatus != REMOVED')    
      .withCondition('CampaignStatus != REMOVED')
      .withCondition('CampaignName CONTAINS "_Search_"'  )
      .withCondition("LabelNames CONTAINS_NONE ['"+ labelName +"']")
      .get();
  } catch(err) {
    
    // an error is given if the label does not exist
    // remove all adgroup negative keywords
    // create label
    // do the query again
    
    Logger.log(err);
    AdsApp.createLabel(labelName, 'These adgroups have been labelled by the cross adgroup negatives script.', 'grey');

    var adgroupIterator = AdsApp.adGroups()
      .withCondition('AdGroupStatus != REMOVED')    
      .withCondition('CampaignStatus != REMOVED')
      .withCondition('CampaignName CONTAINS "_Search_"'  )
      .withCondition("LabelNames CONTAINS_NONE ['"+ labelName +"']")
      .get();
  }

  var adGroupsWithoutLabel = adgroupIterator.totalNumEntities();

  Logger.log('To process');
  Logger.log(adGroupsWithoutLabel);

  if(adGroupsWithoutLabel == 0) {
    Logger.log('All adgroups have been processed, remove label to reset');
  }

  if (adgroupIterator.hasNext()) {
    while (adgroupIterator.hasNext()) {
      var adgroup = adgroupIterator.next();
      

      
      Logger.log("======================================================");
      Logger.log(adgroup.getName());
      Logger.log("======================================================");
      
      // remove current negatives
      removeNegativeKeywordsFromAdGroup([adgroup.getId()]);
      
      // add negatives to the appropriate ad groups
      queryForKeywords(adgroup.getName(), adgroup);
      
      // apply label to adgroup after keywords are added
      adgroup.applyLabel(labelName);
    }
  }

}

function removeRegExp(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '');
}

function queryForKeywords(adGroupName, adgroup) {
  // Replace this value with the project ID listed in the Google
  // Cloud Platform project.
  var projectId = 'unleashed-237112';

  var dataSetId = 'google_ads';
  var tableId = 'ADGROUP_PERFORMANCE_REPORT';

  var fullTableName = '`' + projectId + '.' + dataSetId + '.' + tableId + '`';

  Logger.log('Starting query for ' + adGroupName);

  var adgroupWithoutLastWord = adGroupName.match(/\w+#\w+ - (.*) - .*$/) ? " = '" + adGroupName.match(/\w+#\w+ - (.*) - .*$/)[1] + "'" : ' is null';
  // only exclude adgroups with the same or longer length
  var queryRequest = BigQuery.newQueryRequest();
  queryRequest.useLegacySql = false;
  
  // all keywords in this query will be added
  queryRequest.query = "SELECT \
  AdGroupName \
  from " + fullTableName + " \
  WHERE \
  CampaignName LIKE '%_Search_%' \
  AND regexp_extract(AdGroupName ,r'\\w+#\\w+ - (.*) - .*$') " + adgroupWithoutLastWord +"\
  AND AdGroupName != '" + adGroupName + "'\
  GROUP BY regexp_extract(AdGroupName ,r'\\w+#\\w+ - (.*) - .*$'), AdGroupName;";
  
  Logger.log(queryRequest.query);

  
  var query = BigQuery.Jobs.query(queryRequest, projectId);
  

  // create negatives in adgroup
  if (query.jobComplete && query.rows) {
    Logger.log(query.rows);
    for (var i = 0; i < query.rows.length; i++) {
      var row = query.rows[i];
      var values = [];
      for (var j = 0; j < row.f.length; j++) {
        var value = row.f[j].v;
        values.push(value);

        // negative keyword is generated based on the non matching adgroup names
        // modified broad match is created
        var negative = value.replace(/\w+#\w+ - /g,'+').replace(/( - | )/g,' +');
        //Logger.log(negative);
        //
        //
        //
        // enable this to create the negative keyword
        adgroup.createNegativeKeyword(negative);
      }
      Logger.log(values.join(','));
    }
  }

}


