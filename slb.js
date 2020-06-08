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
AWS.config.update({ region: config.AWS.Region });
AWS.config.credentials = new AWS.Credentials(config.AWS.AccessKey, config.AWS.SecretKey);
var elbv2 = new AWS.ELBv2();
var priority = 100;

main();

async function main() {

    config.SLB.forEach(async slb => {

        var slbParams = {
            "RegionId": config.Alicloud.Endpoint,
            "LoadBalancerId": slb
        }
        var slbResult = await getSLBAttributes(slb);
        if(slbResult.code == -1){
            console.log('Get SLB information error, then exit.');
            return;
        }
        var ELBArn = await createLoadBalancer('LB-' + new Date().getSeconds() + '-' + slbResult.data.LoadBalancerId);
        if(ELBArn.code == 0){
            console.log('Application Load Balancer: ' + ELBArn.data + ' Created!');
        }
        else
        {
            console.log('Get SLB information error, then exit.');
            return;
        }
        slbResult.data.ListenerPortsAndProtocal.ListenerPortAndProtocal.forEach(async listener => {
            var slbListenerResult = await getListenerAttributes(listener.ListenerPort, listener.ListenerProtocal, slbResult.data.LoadBalancerId);
            if(slbListenerResult.code == -1){
                console.log('Get SLB listener information error, then exit.');
                return;
            }
            var targetGroupResult = await createTargetGroup("tg-" + new Date().getSeconds() + '-' + listener.ListenerPort, listener.ListenerPort, listener.ListenerProtocal, config.AWS.VPCId);
            if(targetGroupResult.code == 0){
                console.log('Target Group: ' + targetGroupResult.data + ' Created!');
            }
            else
            {
                console.log('Failed to create target group');
                return;
            }
            var listenerResult = await createELBListener(targetGroupResult.data, ELBArn.data, listener.ListenerPort, listener.ListenerProtocal);
            if(listenerResult.code == 0){
                console.log('Listener: ' + listenerResult.data + ' Created!');
            }
            else
            {
                console.log('Failed to create listener!');
                return;
            }
            slbListenerResult.data.Rules.Rule.forEach(rule => {
                var albRulesParam = {
                    Actions: [],
                    Conditions: [],
                    ListenerArn: "",
                    Priority: 0
                }
                albRulesParam.Actions.push({ "TargetGroupArn": targetGroupResult.data, "Type": "forward" });
                if (rule.Url)
                    albRulesParam.Conditions.push({ "Field": "path-pattern", "Values": [rule.Url] });
                if (rule.Domain)
                    albRulesParam.Conditions.push({ "Field": "host-header", "Values": [rule.Domain] });
                priority += 1;
                albRulesParam.Priority = priority;
                albRulesParam.ListenerArn = listenerResult.data;
                elbv2.createRule(albRulesParam, function (err, data) {
                    if (data)
                        console.log('Rule: ' + data.Rules[0].RuleArn + ' Created!');
                    if (err)
                        console.log('Failed to create rule: ' + rule.RuleId + '. Cause: ' + err, err.stack); // an error occurred
                });
            })
        })
    })
}

function getSLBAttributes(slb) {
    var slbParams = {
        "RegionId": config.Alicloud.Endpoint,
        "LoadBalancerId": slb
    }

    return new Promise((resolve, reject) => {
        client.request('DescribeLoadBalancerAttribute', slbParams, requestOption).then((result) => {
            resolve(createReturnValue(0, result));
        }, (err) => {
            reject(createReturnValue(-1, err));
        })
    })
}

function getListenerAttributes(port, protocal, SLBId) {

    var listenerParams = {

        "RegionId": config.Alicloud.Endpoint,
        "ListenerPort": port,
        "LoadBalancerId": SLBId
    }

    return new Promise((resolve, reject) => {
        if (protocal == "http") {
            client.request('DescribeLoadBalancerHTTPListenerAttribute', listenerParams, requestOption).then((result) => {
                resolve(createReturnValue(0, result));
            }, (err) => {
                console.log(err);
                reject(createReturnValue(-1, err));
            })
        }
        if (protocal == "https") {
            client.request('DescribeLoadBalancerHTTPSListenerAttribute', listenerParams, requestOption).then((result) => {
                resolve(createReturnValue(0, result));
            }, (err) => {
                console.log(err);
                reject(createReturnValue(-1, err));
            })
        }

    })
}


function createLoadBalancer(ELBName) {
    var params = {
        Name: ELBName,
        Subnets: config.AWS.Subnet
    }

    return new Promise((resolve, reject) => {
        elbv2.createLoadBalancer(params, function (err, data) {
            if (data && data.LoadBalancers[0])
                resolve(createReturnValue(0, data.LoadBalancers[0].LoadBalancerArn));
            else
            {
                console.log(err);
                reject(createReturnValue(-1, err));
            }
        })
    })

}

function createELBListener(targetGroupArn, elbArn, port, protocol) {

    var listenerParams = {
        DefaultActions: [
            {
                TargetGroupArn: targetGroupArn,
                Type: "forward"
            }
        ],
        LoadBalancerArn: elbArn,
        Port: port,
        Protocol: protocol.toUpperCase()
    };
    return new Promise((resolve, reject) => {
        elbv2.createListener(listenerParams, function (err, data) {
            if (data && data.Listeners[0]) {
                resolve(createReturnValue(0, data.Listeners[0].ListenerArn));
            }
            else {
                console.log(err);
                reject(createReturnValue(-1, err));
            }
        })

    })

}

function createTargetGroup(name, port, protocol, VpcId) {

    var tgParams = {
        Name: name,
        Port: port,
        Protocol: protocol.toUpperCase(),
        VpcId: VpcId
    };

    return new Promise((resolve, reject) => {

        elbv2.createTargetGroup(tgParams, (err, data) => {
            if (data && data.TargetGroups[0].TargetGroupArn) {
                resolve(createReturnValue(0, data.TargetGroups[0].TargetGroupArn));
            }
            else
            {
                console.log(err);
                reject(createReturnValue(-1, err));
            }
                
        })
    })
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

