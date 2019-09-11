// Copyright 2016, Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @name Export Data to BigQuery
 *
 * @overview The Export Data to BigQuery script sets up a BigQuery
 *       dataset and tables, downloads a report from Google Ads and then
 *       loads the report to BigQuery.
 *
 * @author Google Ads Scripts Team [adwords-scripts@googlegroups.com]
 *
 * @version 1.4
 *
 * @changelog
 * - version 1.4
 *   - Inserts are split into <10Mb chunks.
 *   - Compress backups to Drive.
 *
 * @changelog
 * - version 1.3
 *   - Global string replace to escape quotes.
 *
 * @changelog
 * - version 1.2
 *   - Global string replace to remove commas.
 *
 * @changelog
 * - version 1.1
 *   - Removed commas from numbers to fix formatting issues.
 *
 * @changelog
 * - version 1.0
 *   - Released initial version.
 */

var CONFIG = {
  BIGQUERY_PROJECT_ID: 'unleashed-237112',
  BIGQUERY_DATASET_ID: 'google_ads',

  // Truncate existing data, otherwise will append.
  TRUNCATE_EXISTING_DATASET: true,
  TRUNCATE_EXISTING_TABLES: true,

  // Back up reports to Google Drive.
  WRITE_DATA_TO_DRIVE: false,
  // Folder to put all the intermediate files.
  DRIVE_FOLDER: 'INSERT_FOLDER_NAME',

  // Default date range over which statistics fields are retrieved.
  DEFAULT_DATE_RANGE: 'YESTERDAY',

  // Lists of reports and fields to retrieve from Google Ads.
  REPORTS: [{NAME: 'ADGROUP_PERFORMANCE_REPORT',
     CONDITIONS: 'WHERE CampaignStatus != REMOVED AND AdGroupStatus != REMOVED',
     FIELDS: {'CampaignName' : 'STRING',
              'AdGroupName' : 'STRING',
              'AdGroupId' : 'STRING',
              'Impressions' : 'INTEGER',
              'Cost' : 'FLOAT',
              'Clicks' : 'INTEGER',
              'Date' : 'STRING'
             }
    }],

  RECIPIENT_EMAILS: [
    'christoph.geypen@mobilevikings.be'
  ]
};

// Impose a limit on the size of BQ inserts: 10MB - 512Kb for overheads.
var MAX_INSERT_SIZE = 10 * 1024 * 1024 - 512 * 1024;

/**
 * Main method
 */
function main() {
  createDataset();
  for (var i = 0; i < CONFIG.REPORTS.length; i++) {
    var reportConfig = CONFIG.REPORTS[i];
    createTable(reportConfig);
  }

  var jobIds = processReports();
  waitTillJobsComplete(jobIds);
  sendEmail(jobIds);
}


/**
 * Creates a new dataset.
 *
 * If a dataset with the same id already exists and the truncate flag
 * is set, will truncate the old dataset. If the truncate flag is not
 * set, then will not create a new dataset.
 */
function createDataset() {
   if (datasetExists()) {
    if (CONFIG.TRUNCATE_EXISTING_DATASET) {
      BigQuery.Datasets.remove(CONFIG.BIGQUERY_PROJECT_ID,
        CONFIG.BIGQUERY_DATASET_ID, {'deleteContents' : true});
      Logger.log('Truncated dataset.');
    } else {
      Logger.log('Dataset %s already exists.  Will not recreate.',
       CONFIG.BIGQUERY_DATASET_ID);
      return;
    }
  }

  // Create new dataset.
  var dataSet = BigQuery.newDataset();
  dataSet.friendlyName = CONFIG.BIGQUERY_DATASET_ID;
  dataSet.datasetReference = BigQuery.newDatasetReference();
  dataSet.datasetReference.projectId = CONFIG.BIGQUERY_PROJECT_ID;
  dataSet.datasetReference.datasetId = CONFIG.BIGQUERY_DATASET_ID;

  dataSet = BigQuery.Datasets.insert(dataSet, CONFIG.BIGQUERY_PROJECT_ID);
  Logger.log('Created dataset with id %s.', dataSet.id);
}

/**
 * Checks if dataset already exists in project.
 *
 * @return {boolean} Returns true if dataset already exists.
 */
function datasetExists() {
  // Get a list of all datasets in project.
  var datasets = BigQuery.Datasets.list(CONFIG.BIGQUERY_PROJECT_ID);
  var datasetExists = false;
  // Iterate through each dataset and check for an id match.
  if (datasets.datasets != null) {
    for (var i = 0; i < datasets.datasets.length; i++) {
      var dataset = datasets.datasets[i];
      if (dataset.datasetReference.datasetId == CONFIG.BIGQUERY_DATASET_ID) {
        datasetExists = true;
        break;
      }
    }
  }
  return datasetExists;
}

/**
 * Creates a new table.
 *
 * If a table with the same id already exists and the truncate flag
 * is set, will truncate the old table. If the truncate flag is not
 * set, then will not create a new table.
 *
 * @param {Object} reportConfig Report configuration including report name,
 *    conditions, and fields.
 */
function createTable(reportConfig) {
  if (tableExists(reportConfig.NAME)) {
    if (CONFIG.TRUNCATE_EXISTING_TABLES) {
      BigQuery.Tables.remove(CONFIG.BIGQUERY_PROJECT_ID,
          CONFIG.BIGQUERY_DATASET_ID, reportConfig.NAME);
      Logger.log('Truncated table %s.', reportConfig.NAME);
    } else {
      Logger.log('Table %s already exists.  Will not recreate.',
          reportConfig.NAME);
      return;
    }
  }

  // Create new table.
  var table = BigQuery.newTable();
  var schema = BigQuery.newTableSchema();
  var bigQueryFields = [];

  // Add each field to table schema.
  var fieldNames = Object.keys(reportConfig.FIELDS);
  for (var i = 0; i < fieldNames.length; i++) {
    var fieldName = fieldNames[i];
    var bigQueryFieldSchema = BigQuery.newTableFieldSchema();
    bigQueryFieldSchema.description = fieldName;
    bigQueryFieldSchema.name = fieldName;
    bigQueryFieldSchema.type = reportConfig.FIELDS[fieldName];

    bigQueryFields.push(bigQueryFieldSchema);
  }

  schema.fields = bigQueryFields;
  table.schema = schema;
  table.friendlyName = reportConfig.NAME;

  table.tableReference = BigQuery.newTableReference();
  table.tableReference.datasetId = CONFIG.BIGQUERY_DATASET_ID;
  table.tableReference.projectId = CONFIG.BIGQUERY_PROJECT_ID;
  table.tableReference.tableId = reportConfig.NAME;

  table = BigQuery.Tables.insert(table, CONFIG.BIGQUERY_PROJECT_ID,
      CONFIG.BIGQUERY_DATASET_ID);

  Logger.log('Created table with id %s.', table.id);
}

/**
 * Checks if table already exists in dataset.
 *
 * @param {string} tableId The table id to check existence.
 *
 * @return {boolean}  Returns true if table already exists.
 */
function tableExists(tableId) {
  // Get a list of all tables in the dataset.
  var tables = BigQuery.Tables.list(CONFIG.BIGQUERY_PROJECT_ID,
      CONFIG.BIGQUERY_DATASET_ID);
  var tableExists = false;
  // Iterate through each table and check for an id match.
  if (tables.tables != null) {
    for (var i = 0; i < tables.tables.length; i++) {
      var table = tables.tables[i];
      if (table.tableReference.tableId == tableId) {
        tableExists = true;
        break;
      }
    }
  }
  return tableExists;
}

/**
 * Process all configured reports
 *
 * Iterates through each report to: retrieve Google Ads data,
 * backup data to Drive (if configured), load data to BigQuery.
 *
 * @return {Array.<string>} jobIds The list of all job ids.
 */
function processReports() {
  var jobIds = [];

  // Iterate over each report type.
  for (var i = 0; i < CONFIG.REPORTS.length; i++) {
    var reportConfig = CONFIG.REPORTS[i];
    Logger.log('Running report %s', reportConfig.NAME);
    // Get data as an array of CSV chunks.
    var csvData = retrieveAdsReport(reportConfig);

    // If configured, back up data.
    if (CONFIG.WRITE_DATA_TO_DRIVE) {
      var folder = getDriveFolder();
      for (var r = 0; r < csvData.length; r++) {
        var fileName = reportConfig.NAME + '_' + (r + 1);
        saveCompressedCsvFile(folder, fileName, csvData[r]);
      }
      Logger.log('Exported data to Drive folder %s for report %s.',
             CONFIG.DRIVE_FOLDER, reportConfig.NAME);
    }

    for (var j = 0; j < csvData.length; j++) {
      // Convert to Blob format.
      var blobData = Utilities.newBlob(csvData[j], 'application/octet-stream');
      // Load data
      var jobId = loadDataToBigquery(reportConfig, blobData, !j ? 1 : 0);
      jobIds.push(jobId);
    }
  }
  return jobIds;
}

/**
 * Writes a CSV file to Drive, compressing as a zip file.
 *
 * @param {!Folder} folder The parent folder for the file.
 * @param {string} fileName The name for the file.
 * @param {string} csvData The CSV data to write to the file.
 */
function saveCompressedCsvFile(folder, fileName, csvData) {
  var compressed = Utilities.zip([Utilities.newBlob(csvData)]);
  compressed.setName(fileName);
  folder.createFile(compressed);
}

/**
 * Retrieves Google Ads data as csv and formats any fields
 * to BigQuery expected format.
 *
 * @param {Object} reportConfig Report configuration including report name,
 *    conditions, and fields.
 *
 * @return {!Array.<string>} a chunked report in csv format.
 */
function retrieveAdsReport(reportConfig) {
  var fieldNames = Object.keys(reportConfig.FIELDS);
  var report = AdsApp.report(
    'SELECT ' + fieldNames.join(',') +
    ' FROM ' + reportConfig.NAME + ' ' + reportConfig.CONDITIONS +
    ' DURING ' + CONFIG.DEFAULT_DATE_RANGE);
  var rows = report.rows();
  var chunks = [];
  var chunkLen = 0;
  var csvRows = [];
  var totalRows = 0;
  // Header row
  var header = fieldNames.join(',');
  csvRows.push(header);
  chunkLen += Utilities.newBlob(header).getBytes().length + 1;

  // Iterate over each row.
  while (rows.hasNext()) {
    var row = rows.next();

    if (chunkLen > MAX_INSERT_SIZE) {
      chunks.push(csvRows.join('\n'));
      totalRows += csvRows.length;
      chunkLen = 0;
      csvRows = [];
    }
    var csvRow = [];
    for (var i = 0; i < fieldNames.length; i++) {
      var fieldName = fieldNames[i];
      var fieldValue = row[fieldName].toString();
      var fieldType = reportConfig.FIELDS[fieldName];
      // Strip off % and perform any other formatting here.
      if (fieldType == 'FLOAT' || fieldType == 'INTEGER') {
        if (fieldValue.charAt(fieldValue.length - 1) == '%') {
          fieldValue = fieldValue.substring(0, fieldValue.length - 1);
        }
        fieldValue = fieldValue.replace(/,/g,'');
      }
      // Add double quotes to any string values.
      if (fieldType == 'STRING') {
        fieldValue = fieldValue.replace(/"/g, '""');
        fieldValue = '"' + fieldValue + '"';
      }
      csvRow.push(fieldValue);
    }
    var rowString = csvRow.join(',');
    csvRows.push(rowString);
    chunkLen += Utilities.newBlob(rowString).getBytes().length + 1;
  }
  if (csvRows) {
    totalRows += csvRows.length;
    chunks.push(csvRows.join('\n'));
  }
  Logger.log('Downloaded ' + reportConfig.NAME + ' with ' + totalRows +
      ' rows, in ' + chunks.length + ' chunks.');
  return chunks;
}

/**
 * Creates a new Google Drive folder. If folder name is already in
 * use will pick the first folder with a matching name.
 *
 * @return {Folder} Google Drive folder to store reports.
 */
function getDriveFolder() {
  var folders = DriveApp.getFoldersByName(CONFIG.DRIVE_FOLDER);
  // Assume first folder is the correct one.
  if (folders.hasNext()) {
   Logger.log('Folder name found.  Using existing folder.');
   return folders.next();
  }
  return DriveApp.createFolder(CONFIG.DRIVE_FOLDER);
}

/**
 * Creates a BigQuery insertJob to load csv data.
 *
 * @param {Object} reportConfig Report configuration including report name,
 *    conditions, and fields.
 * @param {Blob} data Csv report data as an 'application/octet-stream' blob.
 * @param {number=} skipLeadingRows Optional number of rows to skip.
 *
 * @return {string} jobId The job id for upload.
 */
function loadDataToBigquery(reportConfig, data, skipLeadingRows) {
  // Create the data upload job.
  var job = {
    configuration: {
      load: {
        destinationTable: {
          projectId: CONFIG.BIGQUERY_PROJECT_ID,
          datasetId: CONFIG.BIGQUERY_DATASET_ID,
          tableId: reportConfig.NAME
        },
        skipLeadingRows: skipLeadingRows ? skipLeadingRows : 0,
        nullMarker: '--'
      }
    }
  };

  var insertJob = BigQuery.Jobs.insert(job, CONFIG.BIGQUERY_PROJECT_ID, data);
  Logger.log('Load job started for %s. Check on the status of it here: ' +
      'https://bigquery.cloud.google.com/jobs/%s', reportConfig.NAME,
       CONFIG.BIGQUERY_PROJECT_ID);
  return insertJob.jobReference.jobId;
}

/**
 * Polls until all jobs are 'DONE'.
 *
 * @param {Array.<string>} jobIds The list of all job ids.
 */
function waitTillJobsComplete(jobIds) {
  var complete = false;
  var remainingJobs = jobIds;
  while (!complete) {
    if (AdsApp.getExecutionInfo().getRemainingTime() < 5){
      Logger.log('Script is about to timeout, jobs ' + remainingJobs.join(',') +
        ' are still incomplete.');
    }
    remainingJobs = getIncompleteJobs(remainingJobs);
    if (remainingJobs.length == 0) {
      complete = true;
    }
    if (!complete) {
      Logger.log(remainingJobs.length + ' jobs still being processed.');
      // Wait 5 seconds before checking status again.
      Utilities.sleep(5000);
    }
  }
  Logger.log('All jobs processed.');
}

/**
 * Iterates through jobs and returns the ids for those jobs
 * that are not 'DONE'.
 *
 * @param {Array.<string>} jobIds The list of job ids.
 *
 * @return {Array.<string>} remainingJobIds The list of remaining job ids.
 */
function getIncompleteJobs(jobIds) {
  var remainingJobIds = [];
  for (var i = 0; i < jobIds.length; i++) {
    var jobId = jobIds[i];
    var getJob = BigQuery.Jobs.get(CONFIG.BIGQUERY_PROJECT_ID, jobId);
    if (getJob.status.state != 'DONE') {
      remainingJobIds.push(jobId);
    }
  }
  return remainingJobIds;
}


/**
 * Sends a notification email that jobs have completed loading.
 *
 * @param {Array.<string>} jobIds The list of all job ids.
 */
function sendEmail(jobIds) {
  var html = [];
  html.push(
    '<html>',
      '<body>',
        '<table width=800 cellpadding=0 border=0 cellspacing=0>',
          '<tr>',
            '<td colspan=2 align=right>',
              "<div style='font: italic normal 10pt Times New Roman, serif; " +
                  "margin: 0; color: #666; padding-right: 5px;'>" +
                  'Powered by Google Ads Scripts</div>',
            '</td>',
          '</tr>',
          "<tr bgcolor='#3c78d8'>",
            '<td width=500>',
              "<div style='font: normal 18pt verdana, sans-serif; " +
              "padding: 3px 10px; color: white'>Ads data load to " +
              "Bigquery report</div>",
            '</td>',
            '<td align=right>',
              "<div style='font: normal 18pt verdana, sans-serif; " +
              "padding: 3px 10px; color: white'>",
               AdsApp.currentAccount().getCustomerId(),
            '</tr>',
          '</table>',
          '<table width=800 cellpadding=0 border=1 cellspacing=0>',
            "<tr bgcolor='#ddd'>",
              "<td style='font: 12pt verdana, sans-serif; " +
                  'padding: 5px 0px 5px 5px; background-color: #ddd; ' +
                  "text-align: left'>Report</td>",
              "<td style='font: 12pt verdana, sans-serif; " +
                  'padding: 5px 0px 5px 5px; background-color: #ddd; ' +
                  "text-align: left'>JobId</td>",
              "<td style='font: 12pt verdana, sans-serif; " +
                  'padding: 5px 0px 5x 5px; background-color: #ddd; ' +
                  "text-align: left'>Rows</td>",
              "<td style='font: 12pt verdana, sans-serif; " +
                  'padding: 5px 0px 5x 5px; background-color: #ddd; ' +
                  "text-align: left'>State</td>",
              "<td style='font: 12pt verdana, sans-serif; " +
                  'padding: 5px 0px 5x 5px; background-color: #ddd; ' +
                  "text-align: left'>ErrorResult</td>",
            '</tr>',
            createTableRows(jobIds),
        '</table>',
      '</body>',
    '</html>');

  MailApp.sendEmail(CONFIG.RECIPIENT_EMAILS.join(','),
      'Ads data load to Bigquery Complete', '',
      {htmlBody: html.join('\n')});
}

/**
 * Creates table rows for email report.
 *
 * @param {Array.<string>} jobIds The list of all job ids.
 */
function createTableRows(jobIds) {
  var html = [];
  for (var i = 0; i < jobIds.length; i++) {
    var jobId = jobIds[i];
    var job = BigQuery.Jobs.get(CONFIG.BIGQUERY_PROJECT_ID, jobId);
    var errorResult = '';
    if (job.status.errorResult) {
      errorResult = job.status.errorResult;
    }

    html.push('<tr>',
      "<td style='padding: 0px 10px'>" +
        job.configuration.load.destinationTable.tableId + '</td>',
      "<td style='padding: 0px 10px'>" + jobId + '</td>',
        "<td style='padding: 0px 10px'>" +
          (job.statistics.load ? job.statistics.load.outputRows : 0) +'</td>',
      "<td style='padding: 0px 10px'>" + job.status.state + '</td>',
      "<td style='padding: 0px 10px'>" + errorResult + '</td>',
      '</tr>');
  }
  return html.join('\n');
}
