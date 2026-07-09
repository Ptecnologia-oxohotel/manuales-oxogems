/**
 * @file Code.gs
 * @description Entry point for the OxoHotel Dashboard. Handles routing and template inclusion.
 */

/**
 * Serves the web application.
 * @param {GoogleAppsScript.Events.DoGet} e - Event object.
 * @returns {GoogleAppsScript.HTML.HtmlOutput} - The HTML output.
 */
function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('OxoGems')
    .setFaviconUrl('https://www.oxohotel.com/favicon.ico')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Injects HTML content from a separate file into the template.
 * @param {string} filename - The name of the file to include.
 * @returns {string} - The content of the file.
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
