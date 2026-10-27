#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { resolve } from 'node:path';
import { StaticSiteStack } from "../lib/static-site-stack";
import { EcsStack } from '../lib/ecs-stack';

process.loadEnvFile(resolve(__dirname, '../../.env.production'));

function requiredEnvironmentVariable(name: string): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`${name} must be set in the repository-root .env.production file.`);
	}
	return value;
}

const app = new cdk.App();
new StaticSiteStack(app, "StaticSiteStack", {
	/* If you don't specify 'env', this stack will be environment-agnostic.
	 * Account/Region-dependent features and context lookups will not work,
	 * but a single synthesized template can be deployed anywhere. */
	/* Uncomment the next line to specialize this stack for the AWS Account
	 * and Region that are implied by the current CLI configuration. */
	// env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION },
	/* Uncomment the next line if you know exactly what Account and Region you
	 * want to deploy the stack to. */
	 env: { account: "278741241847", region: "us-east-1" },
	/* For more information, see https://docs.aws.amazon.com/cdk/latest/guide/environments.html */
});
new EcsStack(app, 'EcsStack', {
  env: { account: '278741241847', region: 'us-east-1' },
  repositoryArn: 'arn:aws:ecr:us-east-1:278741241847:repository/cs4421/wind-ups',
  supabaseUrl: requiredEnvironmentVariable('SUPABASE_URL'),
  supabasePublishableKey: requiredEnvironmentVariable('SUPABASE_PUBLISHABLE_KEY'),
  siteUrl: requiredEnvironmentVariable('SITE_URL'),
});