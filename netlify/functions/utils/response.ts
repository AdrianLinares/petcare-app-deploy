import { HandlerResponse } from '@netlify/functions';

export const successResponse = (data: any, statusCode = 200): HandlerResponse => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    },
    body: JSON.stringify(data),
  };
};

export const errorResponse = (error: any, statusCode = 500): HandlerResponse => {
  console.error('Function error:', error);
  
  // Handle common error messages
  let message = error.message || 'Internal server error';
  let code = statusCode;
  
  if (message === 'Authentication required' || message === 'Invalid or expired token') {
    code = 401;
  } else if (message === 'Insufficient permissions' || message === 'Administrator access required' || message === 'Insufficient admin privileges') {
    code = 403;
  } else if (message.includes('not found')) {
    code = 404;
  } else if (message.includes('already exists') || message.includes('duplicate')) {
    code = 409;
  } else if (message.includes('validation') || message.includes('invalid')) {
    code = 400;
  }
  
  return {
    statusCode: code,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    },
    body: JSON.stringify({ 
      error: message,
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    }),
  };
};

export const corsResponse = (): HandlerResponse => {
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    },
    body: '',
  };
};
