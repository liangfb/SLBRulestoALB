const Core = require('@alicloud/pop-core');
const AWS = require('aws-sdk');
const config = require('./config.json')
const aliEndpoint = 'https://slb.' + config.Alicloud.Endpoint + '.aliyuncs.com'

var requestOption = {
    method: 'POST'
  };
var client = new Core({
  accessKeyId: config.Alicloud.AccessKey,
  accessKeySecret: config.Alicloud.SecretKey,
  endpoint: aliEndpoint,
  apiVersion: '2014-05-15'
});

main();

function main(){

    var aa =new Date().getSeconds();

    console.log(aa);

}

function createReturnValue(code, data){
    var returnValue = {
        code: 0,
        data: {}
    }
    returnValue.code = code;
    returnValue.data = data;
    return returnValue;
}
