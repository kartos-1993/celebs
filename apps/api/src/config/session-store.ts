import { SessionData,Store } from 'express-session';

import { upstashRedis } from './upstash.redis';

export class UpstashRedisStore extends Store {
  private prefix: string;
  private ttl: number;

  constructor(prefix = 'celebs_sess:', ttl = 86400) {
    super();
    this.prefix = prefix;
    this.ttl = ttl;
  }

  public get = (sid: string, callback: (err: any, session?: SessionData | null) => void): void => {
    upstashRedis
      .get<SessionData>(`${this.prefix}${sid}`)
      .then((data: SessionData | null) => callback(null, data || null))
      .catch((err: any) => callback(err));
  };

  public set = (sid: string, session: SessionData, callback?: (err?: any) => void): void => {
    upstashRedis
      .set(`${this.prefix}${sid}`, session, { ex: this.ttl })
      .then(() => {
        if (callback) callback(null);
      })
      .catch((err: any) => {
        if (callback) callback(err);
      });
  };

  public destroy = (sid: string, callback?: (err?: any) => void): void => {
    upstashRedis
      .del(`${this.prefix}${sid}`)
      .then(() => {
        if (callback) callback(null);
      })
      .catch((err: any) => {
        if (callback) callback(err);
      });
  };

  public touch = (sid: string, session: SessionData, callback?: (err?: any) => void): void => {
    upstashRedis
      .expire(`${this.prefix}${sid}`, this.ttl)
      .then(() => {
        if (callback) callback(null);
      })
      .catch((err: any) => {
        if (callback) callback(err);
      });
  };
}
