// rerun after account structure changes - keywords, adgroups, campaign
const labelName = 'cross-adgroup-negatives-added';

function main() {
  getAdGroups();
}

function removeNegativeKeywordsFromAdGroups() {
  // If you have multiple ad groups with the same name, this snippet will
  // pick an arbitrary matching ad group each time. In such cases, just
  // filter on the campaign name as well:
  //
  // AdsApp.adGroups()
  //     .withCondition('Name = "INSERT_ADGROUP_NAME_HERE"')
  //     .withCondition('CampaignName = "INSERT_CAMPAIGN_NAME_HERE"')
  Logger.log('removing current negatives from all AdGroups');
  const adGroupIterator = AdsApp.adGroups().get();
  if (adGroupIterator.hasNext()) {
    const adGroup = adGroupIterator.next();
    const negativeKeywordIterator = adGroup.negativeKeywords().get();
    while (negativeKeywordIterator.hasNext()) {
      const negativeKeyword = negativeKeywordIterator.next();
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
      // .withCondition('CampaignName CONTAINS "_Search_"'  )
      .withCondition(`LabelNames CONTAINS_NONE ['${labelName}']`)
      .get();
  } catch (err) {
    // an error is given if the label does not exist
    // remove all adgroup negative keywords
    // create label
    // do the query again

    Logger.log(err);
    removeNegativeKeywordsFromAdGroups();
    AdsApp.createLabel(
      labelName,
      'These adgroups have been labelled by the cross adgroup negatives script.',
      'grey',
    );

    var adgroupIterator = AdsApp.adGroups()
      .withCondition('AdGroupStatus != REMOVED')
      .withCondition('CampaignStatus != REMOVED')
      .withCondition('CampaignName CONTAINS "_Search_"')
      .withCondition(`LabelNames CONTAINS_NONE ['${labelName}']`)
      .get();
  }

  const adGroupsWithoutLabel = adgroupIterator.totalNumEntities();

  Logger.log('To process');
  Logger.log(adGroupsWithoutLabel);

  if (adGroupsWithoutLabel == 0) {
    Logger.log('All adgroups have been processed, remove label to reset');
  }

  if (adgroupIterator.hasNext()) {
    while (adgroupIterator.hasNext()) {
      const adgroup = adgroupIterator.next();
      Logger.log('======================================================');
      Logger.log(adgroup.getName());
      Logger.log('======================================================');
      queryForKeywords(adgroup.getName(), adgroup);
    }
  }
}

function removeRegExp(text) {
  return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '');
}

function adGroupKeywordsWhere(adGroupName) {
  const cleanName = adGroupName.replace(/(\w+\#\w+ - |- )/g, '');

  // check if negative words are in adgroup name
  // in any order
  let where = '';
  const words = cleanName.split(' ');
  Logger.log(words);

  let i;
  for (i = 0; i < words.length; i++) {
    const word = words[i];
    where += `NOT REGEXP_MATCH(AdGroupName, '${removeRegExp(word)}')`;
    if (i != words.length - 1) {
      where += ' AND ';
    }
  }

  return where;
}

function queryForKeywords(adGroupName, adgroup) {
  // Replace this value with the project ID listed in the Google
  // Cloud Platform project.
  const projectId = 'unleashed-237112';

  const dataSetId = 'google_ads';
  const tableId = 'ADGROUP_PERFORMANCE_REPORT';

  const fullTableName = `${projectId}:${dataSetId}.${tableId}`;

  const where = adGroupKeywordsWhere(adGroupName);
  Logger.log('Starting query');
  Logger.log(where);

  const queryRequest = BigQuery.newQueryRequest();
  // it cannot match > adjust where clause
  // all keywords in this query will be added
  queryRequest.query = `SELECT AdGroupName \
  from [${
  fullTableName
}] WHERE \
  CampaignName LIKE '%_Search_%' AND ${
  where
}\
  GROUP BY AdGroupName;`;
  const query = BigQuery.Jobs.query(queryRequest, projectId);

  // create negatives in adgroup
  // create label for processed adgroups
  if (query.jobComplete) {
    for (let i = 0; i < query.rows.length; i++) {
      const row = query.rows[i];
      const values = [];
      for (let j = 0; j < row.f.length; j++) {
        const value = row.f[j].v;
        values.push(value);

        const negative = value
          .replace(/\w+#\w+ - /g, '+')
          .replace(/( - | )/g, ' +');
        // Logger.log(negative);
        adgroup.createNegativeKeyword(negative);
      }
      // Logger.log(values.join(','));
    }
  }

  // apply label to adgroup after keywords are added
  adgroup.applyLabel(labelName);
}
