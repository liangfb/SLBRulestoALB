const Core = require('@alicloud/pop-core');
const AWS = require('aws-sdk');
const config = require('./config.json')

var requestOption = {
    method: 'POST'
  };
var client = new Core({
  accessKeyId: config.Alicloud.AccessKey,
  accessKeySecret: config.Alicloud.SecretKey,
  endpoint: 'https://slb.' + config.Alicloud.Endpoint + '.aliyuncs.com',
  apiVersion: '2014-05-15'
});
AWS.config.update({region: config.AWS.Region});
AWS.config.credentials = new AWS.Credentials(config.AWS.AccessKey, config.AWS.SecretKey);
var elbv2 = new AWS.ELBv2();
var priority = 100;
config.MappingConfigs.forEach(mappingitem => {
    mappingitem.Targets.forEach(target =>{
        var slbParams = {
            "RegionId": config.Alicloud.Endpoint,
            "LoadBalancerId": mappingitem.SLBId,
            "ListenerPort": target.SLBListenerPort
        }
        client.request('DescribeRules', slbParams, requestOption).then((result) => {
            result.Rules.Rule.forEach(rule=>{
                var albParam = {
                    Actions:[],
                    Conditions:[],
                    ListenerArn: "",
                    Priority: 0
                }
                albParam.Actions.push({"TargetGroupArn": mappingitem.TargetGroupArn, "Type": "forward"});
                if(rule.Url)
                    albParam.Conditions.push({"Field": "path-pattern", "Values": [ rule.Url ]});
                if(rule.Domain)
                albParam.Conditions.push({"Field": "host-header", "Values": [ rule.Domain ]});
                priority += 1;
                albParam.Priority = priority;
                albParam.ListenerArn = target.ALBListenerArn;
                elbv2.createRule(albParam, function(err, data) {
                    if (data)
                        console.log('Created rule: ' + data.Rules[0].RuleArn);
                    if (err) 
                    {
                        console.log(err, err.stack); // an error occurred
                        return;
                    }
                });
            })
        }, (ex) => {
            console.log(ex);
        })
    })
});
