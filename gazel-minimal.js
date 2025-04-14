document.addEventListener('DOMContentLoaded', function() {
  console.log('Gazel minimal script loaded');
  
  const urlField = document.querySelector('.url-field');
  const urlButton = document.querySelector('.url-button');
  
  console.log('Elements found:', {
    field: !!urlField,
    button: !!urlButton
  });
  
  if (urlButton) {
    urlButton.addEventListener('click', function(event) {
      event.preventDefault();
      
      const url = urlField ? urlField.value.trim() : '';
      console.log('Button clicked with URL:', url);
      
      if (url) {
        const formattedURL = url.includes('://') ? url : 'https://' + url;
        console.log('Redirecting to loading page with URL:', formattedURL);
        window.location.href = '/loading?url=' + encodeURIComponent(formattedURL);
      }
    });
  }
});