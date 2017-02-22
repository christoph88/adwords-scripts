function main() {
  var url = "https://raw.githubusercontent.com/christoph88/adwords_scripts/master/BE_test.js";
  eval(UrlFetchApp.fetch(url).getContentText());
}
