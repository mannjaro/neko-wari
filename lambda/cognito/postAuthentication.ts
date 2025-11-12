import { PostAuthenticationTriggerHandler } from 'aws-lambda';

export const handler: PostAuthenticationTriggerHandler = async (event) => {
  console.log('PreAuthentication event:', JSON.stringify(event, null, 2));

  const identities = event.request.userAttributes?.identities;
  const parsedIds = JSON.parse(identities)
  const userId = parsedIds[0].userId
  console.log('Extracted email/identities:', JSON.parse(identities));

  const allowedIds = ['****', '****'];
  console.log('Allowed emails:', allowedIds);

  if (!userId || !allowedIds.includes(userId)) {
    console.error('Authentication failed for email:', userId);
    throw new Error('Unauthorized user');
  }

  console.log('Authentication successful for email:', userId);
  return event;
};