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
            .catch(function(error: { data: string }) {
              console.log(error.data);
              responseString = '';
            }),
        ),
      2000,
    );
  });
  return responseString;
}
