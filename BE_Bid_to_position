// Copyright 2015, Google Inc. All Rights Reserved.
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
 * @name MCC Bid To Position
 *
 * @overview The MCC Bid To Position script adjusts your bids and allows you to
 *     steer ads in a group of advertiser accounts under your MCC account into
 *     a desired position in the search results.
 *     See
 * https://developers.google.com/adwords/scripts/docs/solutions/mccapp-bid-to-position
 *     for more details.
 *
 * @author AdWords Scripts Team [adwords-scripts@googlegroups.com]
 *
 * @version 1.0.1
 *
 * @changelog
 * - version 1.0.1
 *   - Refactored to improve readability.
 * - version 1.0
 *   - Released initial version.
 */

// An account-level label that identifies all the accounts you are trying to
// optimize.
var TARGET_ACCOUNT_LABEL = 'BE';

// Label name for position
var POSITION_LABEL = "Target position #"

// Once the keywords fall within TOLERANCE of TARGET_AVERAGE_POSITION,
// their bids will no longer be adjusted.
var TOLERANCE = 0.1;

// How much to adjust the bids.
var BID_ADJUSTMENT_COEFFICIENT = 1.05;


/**
 * The main method.
 */
function main() {
  var accountSelector = MccApp.accounts();
  if (TARGET_ACCOUNT_LABEL != '') {
    accountSelector.withCondition(
        'Labels CONTAINS \'' + TARGET_ACCOUNT_LABEL + '\'');
  }
  accountSelector.executeInParallel('adjustBids');
}

/**
 * Adjusts the bid for a single account.
 *
 * @return {Object} a result object that has details about how many keyword
 *      bids were adjusted.
 */
function adjustBids() {
  var raisedKeywordCount = raiseKeywordBids();
  var loweredKeywordCount = lowerKeywordBids();
}

/**
 * Raises the bids for keywords in an account.
 *
 * @return {number} The number of keywords whose bids were raised.
 */
function raiseKeywordBids() {


   var labelSelector = AdWordsApp.labels()
     .withCondition("Name CONTAINS '" + POSITION_LABEL + "'")
  

   var labelIterator = labelSelector.get();
   while (labelIterator.hasNext()) {
     var label = labelIterator.next();
     var position = label.getName().split("#")[1];
     
     Logger.log('position is'+position);

     var keywordsToRaise = getKeywordsToRaise(position);

     while (keywordsToRaise.hasNext()) {
       var keyword = keywordsToRaise.next();
       keyword.bidding().setCpc(getIncreasedCpc(keyword.bidding().getCpc()));
     }
   }

}

/**
 * Lowers the bids for keywords in an account.
 *
 * @return {number} The number of keywords whose bids were lowered.
 */
function lowerKeywordBids() {

  var labelSelector = AdWordsApp.labels()
    .withCondition("Name CONTAINS '" + POSITION_LABEL + "'")


    var labelIterator = labelSelector.get();
  while (labelIterator.hasNext()) {
    var label = labelIterator.next();
    var position = label.getName().split("#")[1];
    
    Logger.log('position is'+position);

    var keywordsToLower = getKeywordsToLower(position);

    while (keywordsToLower.hasNext()) {
      var keyword = keywordsToLower.next();
      keyword.bidding().setCpc(getDecreasedCpc(keyword.bidding().getCpc()));
    }
   }
}

/**
 * Increases a given CPC using the bid adjustment coefficient.
 * @param {number} cpc - the CPC to increase
 * @return {number} the new CPC
 */
function getIncreasedCpc(cpc) {
  return cpc * BID_ADJUSTMENT_COEFFICIENT;
}

/**
 * Decreases a given CPC using the bid adjustment coefficient.
 * @param {number} cpc - the CPC to decrease
 * @return {number} the new CPC
 */
function getDecreasedCpc(cpc) {
  return cpc / BID_ADJUSTMENT_COEFFICIENT;
}

/**
 * Gets an iterator of the keywords that need to have their CPC raised.
 * @return {Iterator} an iterator of the keywords
 */
function getKeywordsToRaise(TARGET_AVERAGE_POSITION) {
  var positionFloat = Number(TARGET_AVERAGE_POSITION);
  Logger.log("LabelNames CONTAINS_ANY ['" + POSITION_LABEL + TARGET_AVERAGE_POSITION + "']");
  // Condition to raise bid: Average position is greater (worse) than
  // target + tolerance
  return AdWordsApp.keywords()
      .withCondition('Status = ENABLED')
      .withCondition(
          'AveragePosition > ' + (positionFloat + TOLERANCE))
      .withCondition("LabelNames CONTAINS_ANY ['" + POSITION_LABEL + TARGET_AVERAGE_POSITION + "']")
      .orderBy('AveragePosition ASC')
      .forDateRange('LAST_7_DAYS')
      .get();
}

/**
 * Gets an iterator of the keywords that need to have their CPC lowered.
 * @return {Iterator} an iterator of the keywords
 */
function getKeywordsToLower(TARGET_AVERAGE_POSITION) {
  var positionFloat = Number(TARGET_AVERAGE_POSITION);
  Logger.log("LabelNames CONTAINS_ANY ['" + POSITION_LABEL + TARGET_AVERAGE_POSITION + "']");
  // Conditions to lower bid: Ctr greater than 1% AND
  // average position less (better) than target - tolerance
  return AdWordsApp.keywords()
      .withCondition('Ctr > 0.01')
      .withCondition(
          'AveragePosition < ' + (positionFloat - TOLERANCE))
      .withCondition("LabelNames CONTAINS_ANY ['" + POSITION_LABEL + TARGET_AVERAGE_POSITION + "']")
      .withCondition('Status = ENABLED')
      .orderBy('AveragePosition DESC')
      .forDateRange('LAST_7_DAYS')
      .get();
}
