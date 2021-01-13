#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import { SignupTestStack } from '../lib/signup_test-stack';

const app = new cdk.App();
new SignupTestStack(app, 'SignupTestStack');
