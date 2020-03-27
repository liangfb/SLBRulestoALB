# 将阿里云SLB负载均衡规则复制到AWS ALB

1. 创建阿里云和AWS的Access Key
2. git clone https://github.com/liangfb/SLBRulestoALB.git
3. cd SLBRulestoALB
4. npm install
5. 编辑配置文件
    - 修改Access Key
    - 修改阿里云和AWS的区域信息
    - 编辑映射关系
       SLBId: 阿里云上的SLB负载均衡Id
       TargetGroupArn: 在AWS上Target Group ARN
       Targets: 阿里云SLB下的侦听端口和对应AWS ALB的Listener ARN
6. node slb.js
