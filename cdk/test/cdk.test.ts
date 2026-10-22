import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { EcsStack } from '../lib/ecs-stack';

test('ECS task definition uses the imported ECR repository', () => {
  const app = new cdk.App();
  const stack = new EcsStack(app, 'EcsStack', {
    env: { account: '278741241847', region: 'us-east-1' },
    repositoryArn: 'arn:aws:ecr:us-east-1:278741241847:repository/cs4421/wind-ups',
  });
  const template = Template.fromStack(stack);
  const serializedTemplate = JSON.stringify(template.toJSON());

  template.resourceCountIs('AWS::ECS::TaskDefinition', 1);
  expect(serializedTemplate).toContain('278741241847.dkr.ecr.us-east-1.');
  expect(serializedTemplate).toContain('/cs4421/wind-ups:');
  expect(serializedTemplate).toContain('"Ref":"ImageTag"');
  template.resourceCountIs('AWS::ECR::Repository', 0);
});
