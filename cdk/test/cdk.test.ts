import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { EcsStack } from '../lib/ecs-stack';

test('ECS task definition uses the imported ECR repository', () => {
  const app = new cdk.App();
  const stack = new EcsStack(app, 'EcsStack', {
    env: { account: '278741241847', region: 'us-east-1' },
    repositoryArn: 'arn:aws:ecr:us-east-1:278741241847:repository/cs4421/wind-ups',
    supabaseUrl: 'https://project.supabase.co',
    supabasePublishableKey: 'test-publishable-key',
    siteUrl: 'https://example.com',
  });
  const template = Template.fromStack(stack);
  const serializedTemplate = JSON.stringify(template.toJSON());

  template.resourceCountIs('AWS::ECS::TaskDefinition', 1);
  expect(serializedTemplate).toContain('278741241847.dkr.ecr.us-east-1.');
  expect(serializedTemplate).toContain('/cs4421/wind-ups:');
  expect(serializedTemplate).toContain('"Ref":"ImageTag"');
  expect(serializedTemplate).toContain('"SUPABASE_URL"');
  expect(serializedTemplate).toContain('"SUPABASE_PUBLISHABLE_KEY"');
  expect(serializedTemplate).toContain('"SITE_URL"');
  expect(serializedTemplate).toContain('"Value":"https://project.supabase.co"');
  expect(serializedTemplate).toContain('"Value":"test-publishable-key"');
  expect(serializedTemplate).toContain('"Value":"https://example.com"');
  template.resourceCountIs('AWS::ECR::Repository', 0);
});
