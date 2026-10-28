import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { SupabaseClientService } from './supabase-client.service';

describe('SupabaseClientService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('provides one Supabase client configured with public anon credentials', () => {
    const service = TestBed.inject(SupabaseClientService);
    const sameService = TestBed.inject(SupabaseClientService);
    const configuration = service.client as unknown as {
      supabaseUrl: string;
      supabaseKey: string;
    };

    expect(service).toBe(sameService);
    expect(configuration.supabaseUrl).toBe(environment.supabaseUrl);
    expect(configuration.supabaseKey).toBe(environment.supabaseAnonKey);
    expect(environment).toEqual({
      supabaseUrl: 'https://tvxlscokuqaztbumdgby.supabase.co',
      supabaseAnonKey:
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR2eGxzY29rdXFhenRidW1kZ2J5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMxNTIyMzYsImV4cCI6MjEwODcyODIzNn0.lnvTOG7LSYvgudw5wmRFW5vPm7CvY7C95P3SmpI5-50',
    });
  });
});
