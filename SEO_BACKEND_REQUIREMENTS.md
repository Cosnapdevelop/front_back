# SEO Backend Requirements for Cosnap AI

**Created by**: Frontend Development Team  
**For**: Backend Architect  
**Date**: August 21, 2025  
**Priority**: High (Week 3-4 Implementation)

## Executive Summary

The frontend SEO implementation is complete and ready for integration. To enable full SEO functionality, the backend needs to implement several API endpoints and data optimizations. This document outlines the specific requirements for backend support of the SEO infrastructure.

## Required API Endpoints

### 1. Sitemap Generation APIs (CRITICAL)

#### 1.1 Effects Sitemap Data
**Endpoint**: `GET /api/seo/sitemap/effects`

**Purpose**: Provide effect data for dynamic sitemap generation

**Response Format**:
```json
{
  "effects": [
    {
      "id": "123",
      "slug": "portrait-enhancement", // SEO-friendly URL slug
      "name": "Portrait Enhancement",
      "description": "AI-powered portrait enhancement",
      "category": "Portrait",
      "updatedAt": "2025-08-21T10:00:00Z",
      "isPublic": true,
      "previewImage": "/effects/portrait-enhancement.jpg"
    }
  ],
  "lastModified": "2025-08-21T10:00:00Z",
  "totalCount": 156
}
```

**Requirements**:
- Only return public/published effects
- Include SEO-friendly slugs (auto-generate if needed)
- Sort by priority: trending effects first
- Include last modified timestamps
- Filter out hidden/private effects

#### 1.2 User Profiles Sitemap Data
**Endpoint**: `GET /api/seo/sitemap/users`

**Purpose**: Provide public user profile data for sitemap

**Response Format**:
```json
{
  "users": [
    {
      "id": "user123",
      "username": "artist_john",
      "name": "John Smith",
      "isPublic": true,
      "updatedAt": "2025-08-21T09:30:00Z",
      "postCount": 25,
      "isVerified": false
    }
  ],
  "lastModified": "2025-08-21T09:30:00Z",
  "totalCount": 1250
}
```

**Requirements**:
- Only include public profiles
- Exclude private/suspended accounts
- Include users with at least 1 public post
- Sort by activity/popularity

#### 1.3 Community Posts Sitemap Data
**Endpoint**: `GET /api/seo/sitemap/posts`

**Purpose**: Provide public community post data for sitemap

**Response Format**:
```json
{
  "posts": [
    {
      "id": "post456",
      "title": "Amazing AI Portrait Transformation",
      "slug": "amazing-ai-portrait-transformation",
      "authorId": "user123",
      "isPublic": true,
      "updatedAt": "2025-08-21T08:15:00Z",
      "likesCount": 42,
      "effectUsed": "Portrait Enhancement"
    }
  ],
  "lastModified": "2025-08-21T08:15:00Z",
  "totalCount": 5680
}
```

**Requirements**:
- Only public posts
- Include post slugs for SEO URLs
- Exclude reported/moderated content
- Sort by engagement metrics

### 2. Performance Analytics API (MEDIUM PRIORITY)

#### 2.1 Web Vitals Collection
**Endpoint**: `POST /api/analytics/web-vitals`

**Purpose**: Collect Core Web Vitals data for SEO monitoring

**Request Format**:
```json
{
  "metric": "lcp",
  "value": 1200,
  "rating": "good",
  "url": "https://cosnap.ai/effects",
  "userAgent": "Mozilla/5.0...",
  "timestamp": 1692614400000,
  "sessionId": "session123"
}
```

**Requirements**:
- Store performance data for analysis
- Aggregate metrics by page/URL
- Track performance trends over time
- Generate alerts for poor performance

### 3. SEO Data Enhancement APIs (MEDIUM PRIORITY)

#### 3.1 Effect SEO Data
**Endpoint**: `GET /api/effects/:id/seo`

**Purpose**: Provide enhanced SEO data for individual effects

**Response Format**:
```json
{
  "effect": {
    "id": "123",
    "name": "Portrait Enhancement",
    "slug": "portrait-enhancement",
    "description": "Professional AI-powered portrait enhancement with skin smoothing and eye brightening",
    "metaDescription": "Transform portraits with AI-powered enhancement. Professional skin smoothing, eye brightening, and beauty filters. Free online portrait editor.",
    "keywords": ["portrait enhancement", "AI beauty filter", "skin smoothing"],
    "category": "Portrait",
    "tags": ["beauty", "portrait", "enhancement", "professional"],
    "difficulty": "Easy",
    "usageCount": 15420,
    "rating": {
      "average": 4.8,
      "count": 1250
    },
    "relatedEffects": ["eye-enhancement", "skin-smoothing"],
    "previewImages": {
      "before": "/effects/portrait-before.jpg",
      "after": "/effects/portrait-after.jpg",
      "thumbnail": "/effects/portrait-thumb.jpg"
    }
  }
}
```

## Database Schema Updates Required

### 1. Add SEO-Friendly Slugs

#### Effects Table
```sql
ALTER TABLE effects ADD COLUMN slug VARCHAR(255) UNIQUE;
CREATE INDEX idx_effects_slug ON effects(slug);

-- Update existing effects with slugs
UPDATE effects SET slug = LOWER(REPLACE(REPLACE(name, ' ', '-'), '.', '')) WHERE slug IS NULL;
```

#### Posts Table
```sql
ALTER TABLE posts ADD COLUMN slug VARCHAR(255);
CREATE INDEX idx_posts_slug ON posts(slug);

-- Generate slugs for existing posts
UPDATE posts SET slug = CONCAT(LOWER(REPLACE(REPLACE(title, ' ', '-'), '.', '')), '-', id) WHERE slug IS NULL;
```

### 2. SEO Metadata Fields

#### Effects Table Enhancements
```sql
ALTER TABLE effects ADD COLUMN meta_description TEXT;
ALTER TABLE effects ADD COLUMN meta_keywords TEXT;
ALTER TABLE effects ADD COLUMN seo_title VARCHAR(255);
ALTER TABLE effects ADD COLUMN is_indexable BOOLEAN DEFAULT true;
```

#### Posts Table Enhancements
```sql
ALTER TABLE posts ADD COLUMN meta_description TEXT;
ALTER TABLE posts ADD COLUMN is_indexable BOOLEAN DEFAULT true;
```

## URL Structure Updates Required

### 1. SEO-Friendly Routes
The frontend expects these URL patterns:

**Current → SEO-Optimized**
- `/effect/123` → `/effects/portrait-enhancement`
- `/user/456` → `/artists/photographer-john`
- `/post/789` → `/gallery/amazing-ai-transformation`

### 2. Backend Route Mapping
Implement URL slug resolution:

```javascript
// Express.js example
app.get('/effects/:slug', async (req, res) => {
  const effect = await Effect.findOne({ slug: req.params.slug });
  if (!effect) return res.status(404).send('Effect not found');
  
  // Return effect data
  res.json(effect);
});

app.get('/artists/:username', async (req, res) => {
  const user = await User.findOne({ username: req.params.username, isPublic: true });
  if (!user) return res.status(404).send('Artist not found');
  
  res.json(user);
});
```

## Performance Optimization Requirements

### 1. Database Query Optimization

#### Sitemap Queries
- Index on `isPublic`, `updatedAt` fields
- Implement pagination for large datasets
- Cache sitemap data for 1 hour
- Use database views for complex SEO queries

#### SEO Data Queries
- Create materialized views for effect statistics
- Implement Redis caching for frequently accessed data
- Optimize JOIN queries for related content

### 2. Caching Strategy

#### Redis Cache Keys
```
seo:sitemap:effects:{timestamp}
seo:sitemap:users:{timestamp}
seo:sitemap:posts:{timestamp}
seo:effect:{slug}
seo:user:{username}
```

**Cache Duration**:
- Sitemap data: 1 hour
- Effect SEO data: 6 hours
- User profile data: 12 hours

## Security Considerations

### 1. Data Privacy
- Never expose private user data in sitemaps
- Respect user privacy settings
- Filter out sensitive information

### 2. Rate Limiting
- Implement rate limiting on sitemap endpoints
- Monitor for excessive crawling
- Protect against scraping attempts

### 3. Data Validation
- Validate slug uniqueness
- Sanitize user input for SEO fields
- Prevent SEO spam content

## Implementation Priority

### Phase 1: Critical (Week 3) 🔴
1. **Sitemap APIs**: All three endpoints
2. **URL Slug Generation**: Effects and posts
3. **Basic SEO Data**: Meta descriptions for effects

### Phase 2: Important (Week 4) 🟡
1. **Performance Analytics**: Web Vitals collection
2. **Enhanced SEO Data**: Full effect SEO metadata
3. **Caching Implementation**: Redis caching layer

### Phase 3: Optimization (Post-Launch) 🟢
1. **Advanced Analytics**: SEO performance tracking
2. **Automated SEO**: AI-generated meta descriptions
3. **Performance Monitoring**: Real-time alerts

## Testing Requirements

### 1. API Testing
- Validate sitemap data format
- Test pagination and filtering
- Verify performance under load

### 2. SEO Testing
- Test URL slug generation
- Validate meta data accuracy
- Check canonical URL handling

### 3. Performance Testing
- Measure API response times
- Test caching effectiveness
- Monitor database performance

## Integration Timeline

### Week 3 (Current Week)
- **Days 1-2**: Implement sitemap APIs
- **Days 3-4**: Add URL slug generation
- **Days 5-7**: Basic SEO metadata

### Week 4
- **Days 1-3**: Performance analytics API
- **Days 4-5**: Caching implementation
- **Days 6-7**: Testing and optimization

## Success Metrics

### Performance Targets
- **Sitemap API Response**: < 500ms
- **SEO Data API Response**: < 200ms
- **Database Query Time**: < 100ms

### SEO Targets
- **All Effects**: Have SEO-friendly URLs
- **All Public Content**: Included in sitemaps
- **Metadata Coverage**: 100% of effects

## Handoff Requirements

### Documentation Needed
1. API endpoint documentation
2. Database schema changes
3. Deployment procedures
4. Monitoring setup

### Coordination Points
1. **Frontend Team**: URL structure validation
2. **DevOps Team**: Cache configuration
3. **Content Team**: SEO metadata guidelines

---

**Status**: READY FOR IMPLEMENTATION  
**Priority**: HIGH  
**Timeline**: Week 3-4  
**Dependencies**: None (frontend SEO ready)