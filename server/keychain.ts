export function decodeKeychainValue(raw:string):string{
  const value=raw.trim(),prefix='go-keyring-base64:';
  if(!value.startsWith(prefix))return value;
  const encoded=value.slice(prefix.length);
  if(!/^[A-Za-z0-9+/]+={0,2}$/.test(encoded))return '';
  const decoded=Buffer.from(encoded,'base64');
  if(decoded.toString('base64')!==encoded)return '';
  return decoded.toString('utf8');
}
