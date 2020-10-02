import axios from 'axios';

export async function getTargetFileContentRemote(filename: string) {
  let responseString: string = '';
  await new Promise(resolve => {
    setTimeout(
      () =>
        resolve(
          axios({
            method: 'get',
            responseType: 'blob',
            url: filename,
          })
            .then(function(response: { data: string }) {
              responseString = response.data;
            })
            .catch(function() {
              responseString = 'this-file-does-not-exist';
            }),
        ),
      2000,
    );
  });
  return responseString;
}
