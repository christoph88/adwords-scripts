var labelName = 'cross-adgroup-negatives-added';

function main() {
  getAdGroups()
}

function getAdGroups() {  
  Logger.log('Get all adgroups for search');
  // exclude already done ad groups - with a label

  try {
    var adgroupIterator = AdsApp.adGroups()
      .withCondition('AdGroupStatus != REMOVED')    
      .withCondition('CampaignStatus != REMOVED')
    //.withCondition('CampaignName CONTAINS "_Search_"'  )
      .withCondition("LabelNames CONTAINS_NONE ['"+ labelName +"']")
      .get();
  } catch(err) {
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
    throw 'All adgroups have been processed, remove label to reset';
  }

  if (adgroupIterator.hasNext()) {
    while (adgroupIterator.hasNext()) {
      var adgroup = adgroupIterator.next();
      Logger.log("======================================================");
      Logger.log(adgroup.getName());
      Logger.log("======================================================");
      queryForKeywords(adgroup.getName(), adgroup);
    }
  }

}

function removeRegExp(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '');
}

function adGroupKeywordsWhere(adGroupName) {
  var cleanName = adGroupName.replace(/(\w+\#\w+ - |- )/g,'');

  // check if negative words are in adgroup name
  // in any order
  var where = '';        
  var words = cleanName.split(' ');
  Logger.log(words);

  var i;
  for (i = 0; i < words.length; i++) {
    var word = words[i];
    where += "NOT REGEXP_MATCH(AdGroupName, '" + escapeRegExp(word) +"')";
    if (i != (words.length-1)) {
      where += " AND ";    
    }
  }

  return where;

}

function queryForKeywords(adGroupName, adgroup) {
  // Replace this value with the project ID listed in the Google
  // Cloud Platform project.
  var projectId = 'unleashed-237112';

  var dataSetId = 'google_ads';
  var tableId = 'ADGROUP_PERFORMANCE_REPORT';

  var fullTableName = projectId + ':' + dataSetId + '.' + tableId;

  var where = adGroupKeywordsWhere(adGroupName);
  Logger.log('Starting query');
  Logger.log(where);

  var queryRequest = BigQuery.newQueryRequest();
  // it cannot match > adjust where clause
  // all keywords in this query will be added
  queryRequest.query = "SELECT AdGroupName \
  from [" + fullTableName + "] WHERE \
  CampaignName LIKE '%_Search_%' AND " + where + "\
  GROUP BY AdGroupName;";
  var query = BigQuery.Jobs.query(queryRequest, projectId);

  // create negatives in adgroup
  // create label for processed adgroups
  if (query.jobComplete) {
    for (var i = 0; i < query.rows.length; i++) {
      var row = query.rows[i];
      var values = [];
      for (var j = 0; j < row.f.length; j++) {
        var value = row.f[j].v;
        values.push(value);

        var negative = value.replace(/\w+#\w+ - /g,'+').replace(/( - | )/g,' +');
        //Logger.log(negative);
        adgroup.createNegativeKeyword(negative);
      }
      //Logger.log(values.join(','));
    }
  }

  // apply label to adgroup after keywords are added
  adgroup.applyLabel(labelName);
}

