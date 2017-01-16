function main() {
  var pauseAds = AdWordsApp.ads().withCondition("LabelNames CONTAINS_ANY ['School holiday']").get();
  
  while (pauseAds.hasNext()){
    var ad = pauseAds.next();
    ad.pause();
  }
}
