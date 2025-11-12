import { PreAuthenticationTriggerHandler } from 'aws-lambda';

export const handler: PreAuthenticationTriggerHandler = async (event) => {
  console.log('PreAuthentication event:', JSON.stringify(event, null, 2));

  const identities = event.request.userAttributes?.identities;
  console.log('Extracted email/identities:', JSON.parse(identities));

  const allowedIds = ['****', '****'];
  console.log('Allowed emails:', allowedIds);

  if (!identities || !allowedIds.includes(identities)) {
    console.error('Authentication failed for email:', identities);
    throw new Error('Unauthorized user');
  }

  console.log('Authentication successful for email:', identities);
  return event;
};