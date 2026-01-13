import { AppError } from '../utils/appError.js';

const isIpInRange = (ip, range) => {
  if (range.includes('/')) {
    const [subnet, bits] = range.split('/');
    const mask = ~(2 ** (32 - parseInt(bits)) - 1);
    return (ip2long(ip) & mask) === (ip2long(subnet) & mask);
  }
  return ip === range;
};

const ip2long = (ip) => {
  const parts = ip.split('.');
  return parts.reduce((acc, octet) => (acc << 8) + parseInt(octet), 0) >>> 0;
};

export const checkIpRestriction = (req, res, next) => {
  if (process.env.ENABLE_IP_RESTRICTION !== 'true') {
    return next();
  }

  const allowedIps = process.env.ALLOWED_IPS?.split(',') || [];

  if (allowedIps.length === 0) {
    return next();
  }

  const clientIp = req.ip || req.connection.remoteAddress;

  const isAllowed = allowedIps.some(range => isIpInRange(clientIp, range.trim()));

  if (!isAllowed) {
    return next(new AppError('Access denied from your IP address', 403));
  }

  next();
};
