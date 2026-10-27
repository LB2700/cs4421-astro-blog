# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

* `npm run build`   type-check the project
* `npm run watch`   watch for changes and type-check
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template

## ECS image

`EcsStack` imports the existing `cs4421/wind-ups` ECR repository by ARN and
uses it for the ECS task definition. The repository remains externally managed,
so it will not appear as an `AWS::ECR::Repository` resource in this stack.
The task definition contains the repository image URI, and the stack grants
the task execution role permission to pull from it. Set the `ImageTag`
CloudFormation parameter when deploying to select an image tag (defaults to
`latest`).

### ECR image tags

ECR link: `https://us-east-1.console.aws.amazon.com/ecr/repositories/private/278741241847/cs4421/wind-ups/_/details?region=us-east-1`

For this project all ECS images are pushed automatically in response to a github tag,
starting with "v", being pushed. The ECS image tags are generated from the following
format; `${GITHUB_SHA:0:8}-${VERSION}`. This uses the first 8 digits of the commit SHA
and the version of the site. This allows devs to easily checkout a legacy tag and inspect its
state in the event of an emergancy rollback.

### ECS Deployment

Create a repository-root `.env.production` file (next to the root `package.json`)
with the production values:

```dotenv
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<publishable-key>
SITE_URL=https://<your-domain>
```

The CDK app loads this file when it runs, and fails with an explicit error if
the file or a required value is missing. `.env.production` is gitignored; do
not commit it. Deploy without entering the application settings in the
terminal:

```powershell
npx cdk deploy EcsStack
```

Optionally select an image using `--parameters "ImageTag=<image-tag>"`.

Use the publishable (or legacy anon) key only, never the `service_role` key.
The ECS task receives these values as runtime environment variables, so the
application must read them from `process.env`. The publishable key is not a
server secret and will be present in the synthesized CloudFormation template
and ECS task definition. Use AWS Secrets Manager for any true secrets.
Supabase's **Authentication → URL Configuration → Redirect URLs** must allow
`<your-domain>/auth/confirm`.