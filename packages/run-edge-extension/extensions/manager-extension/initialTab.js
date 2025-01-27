/* global edge */
// Create a new tab and set it to background.
// We want the user-selected page to be active,
// not edge://extensions.
function createEdgeExtensionsTab(initialTab, url) {
  // Check if url tab is open
  chrome.tabs.query({url: 'edge://extensions/'}, (tabs) => {
    const extensionsTabExist = tabs.length > 0

    // Return if url exists
    if (extensionsTabExist) return

    // Create an inactive tab
    chrome.tabs.create(
      {url, active: false},
      function setBackgroundTab(extensionsTab) {
        // Get current url tab and move it left.
        // This action auto-activates the tab
        chrome.tabs.move(extensionsTab.id, {index: 0}, () => {
          // Get user-selected initial page tab and activate the right tab
          chrome.tabs.update(initialTab.id, {active: true})
        })
      }
    )
  })
}

const __IS_FIRST_RUN__ = false

chrome.tabs.query({active: true}, ([initialTab]) => {
  if (initialTab.url === 'edge://newtab/') {
    chrome.tabs.update({url: 'edge://extensions/'})
    // WARN: This is generated at runtime by rewriteFirstRunVariable function.
    if (__IS_FIRST_RUN__) {
      chrome.tabs.create({url: 'welcome.html'})
    }
  } else {
    createEdgeExtensionsTab(initialTab, 'edge://extensions/')
  }
})
