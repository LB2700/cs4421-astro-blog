import * as cdk from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as logs from 'aws-cdk-lib/aws-logs';

export interface EcsStackProps extends cdk.StackProps {
  repositoryArn: string;
  supabaseUrl: string;
  supabasePublishableKey: string;
  siteUrl: string;
  certificateArn?: string;
}

export class EcsStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: EcsStackProps) {
    super(scope, id, props);

    const repository = ecr.Repository.fromRepositoryArn(
      this,
      'WindUpsRepository',
      props.repositoryArn,
    );

    const imageTag = new cdk.CfnParameter(this, 'ImageTag', {
      type: 'String',
      default: 'latest',
      minLength: 1,
      description: 'Tag of the x86-64 application image in the ECR repository.',
    });

    const vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [{ name: 'Public', subnetType: ec2.SubnetType.PUBLIC }],
    });

    const logGroup = new logs.LogGroup(this, 'ApplicationLogs', {
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const certificate = props.certificateArn
      ? acm.Certificate.fromCertificateArn(this, 'Certificate', props.certificateArn)
      : undefined;

    const service = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'AstroService', {
      vpc,
      assignPublicIp: true,
      taskSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      certificate,
      redirectHTTP: certificate !== undefined,
      minHealthyPercent: 100,
      circuitBreaker: { rollback: true },
      healthCheck: {
        command: ['CMD-SHELL', 'wget --no-verbose --tries=1 --spider http://localhost:4321/api/health/live || exit 1'],
        timeout: cdk.Duration.seconds(3),
        startPeriod: cdk.Duration.seconds(30),
      },
      taskImageOptions: {
        image: ecs.ContainerImage.fromEcrRepository(repository, imageTag.valueAsString),
        containerPort: 4321,
        environment: {
          NODE_ENV: 'production',
          HOST: '0.0.0.0',
          PORT: '4321',
          SUPABASE_URL: props.supabaseUrl,
          SUPABASE_PUBLISHABLE_KEY: props.supabasePublishableKey,
          SITE_URL: props.siteUrl,
        },
        logDriver: ecs.LogDrivers.awsLogs({ streamPrefix: 'astro', logGroup }),
      },
    });

    service.targetGroup.configureHealthCheck({
      path: '/api/health/ready',
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 3,
    });

    new cdk.CfnOutput(this, 'LoadBalancerDnsName', {
      value: service.loadBalancer.loadBalancerDnsName,
    });
  }
}