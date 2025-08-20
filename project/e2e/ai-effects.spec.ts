/**
 * End-to-end tests for AI effects processing workflows
 * 
 * Tests complete AI effect application flows including:
 * - Effect selection and configuration
 * - Image upload and validation
 * - Task processing and status monitoring
 * - Result gallery and download functionality
 */

import { test, expect } from '@playwright/test';
import { testHelpers, mockEffects, testImageBase64 } from './fixtures/test-data';
import path from 'path';

test.describe('AI Effects E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await testHelpers.login(page);
  });

  test.describe('Effect Selection', () => {
    test('should display available effects', async ({ page }) => {
      await page.goto('/effects');

      // Should show effects grid
      await expect(page.locator('[data-testid="effects-grid"]')).toBeVisible();

      // Should show effect cards
      const effectCards = page.locator('[data-testid="effect-card"]');
      await expect(effectCards).toHaveCount(3); // Based on mock data

      // Each card should have required elements
      for (let i = 0; i < await effectCards.count(); i++) {
        const card = effectCards.nth(i);
        await expect(card.locator('.effect-thumbnail')).toBeVisible();
        await expect(card.locator('.effect-name')).toBeVisible();
        await expect(card.locator('.effect-description')).toBeVisible();
        await expect(card.locator('.apply-effect-btn')).toBeVisible();
      }
    });

    test('should filter effects by category', async ({ page }) => {
      await page.goto('/effects');

      // Click category filter
      await page.click('[data-testid="category-filter-upscale"]');

      // Should show only upscale effects
      const visibleCards = page.locator('[data-testid="effect-card"]:visible');
      await expect(visibleCards).toHaveCount(1);
      
      await expect(visibleCards.first().locator('.effect-name')).toHaveText(/upscale/i);
    });

    test('should search effects by name', async ({ page }) => {
      await page.goto('/effects');

      // Search for specific effect
      await page.fill('[data-testid="effect-search"]', 'face swap');

      // Should show matching results
      const searchResults = page.locator('[data-testid="effect-card"]:visible');
      await expect(searchResults).toHaveCount(1);
      await expect(searchResults.first().locator('.effect-name')).toHaveText(/face swap/i);
    });

    test('should show effect details modal', async ({ page }) => {
      await page.goto('/effects');

      // Click on first effect
      await page.click('[data-testid="effect-card"]');

      // Should open details modal
      const modal = page.locator('[data-testid="effect-details-modal"]');
      await expect(modal).toBeVisible();

      // Modal should have required content
      await expect(modal.locator('.effect-name')).toBeVisible();
      await expect(modal.locator('.effect-description')).toBeVisible();
      await expect(modal.locator('.effect-parameters')).toBeVisible();
      await expect(modal.locator('.apply-effect-btn')).toBeVisible();
    });
  });

  test.describe('Image Upload', () => {
    test('should upload image successfully', async ({ page }) => {
      await page.goto('/effects/apply/1');

      // Create test file
      const testFile = path.join(__dirname, 'fixtures', 'test-image.jpg');
      
      // Upload image
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(testFile);

      // Should show preview
      await expect(page.locator('[data-testid="image-preview"]')).toBeVisible();
      
      // Should show file info
      await expect(page.locator('.file-info')).toContainText('test-image.jpg');
      await expect(page.locator('.file-size')).toBeVisible();
    });

    test('should validate file format', async ({ page }) => {
      await page.goto('/effects/apply/1');

      // Try to upload invalid file type
      const invalidFile = path.join(__dirname, 'fixtures', 'test-document.pdf');
      
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(invalidFile);

      // Should show error
      await expect(page.locator('.error-message')).toContainText(/不支持的文件格式|unsupported format/i);
    });

    test('should validate file size', async ({ page }) => {
      await page.goto('/effects/apply/1');

      // Mock large file upload
      await page.route('/api/upload/image', route => {
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'File too large. Maximum size is 30MB.'
          }),
        });
      });

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(path.join(__dirname, 'fixtures', 'large-image.jpg'));

      // Should show size error
      await expect(page.locator('.error-message')).toContainText(/文件过大|file too large/i);
    });

    test('should handle drag and drop upload', async ({ page }) => {
      await page.goto('/effects/apply/1');

      const dropZone = page.locator('[data-testid="upload-drop-zone"]');
      
      // Simulate drag enter
      await dropZone.dispatchEvent('dragenter', {
        dataTransfer: {
          files: [{ name: 'test.jpg', type: 'image/jpeg' }]
        }
      });

      // Drop zone should highlight
      await expect(dropZone).toHaveClass(/drag-over/);

      // Simulate drop
      await dropZone.dispatchEvent('drop', {
        dataTransfer: {
          files: [{ name: 'test.jpg', type: 'image/jpeg' }]
        }
      });

      // Should process the dropped file
      await expect(page.locator('[data-testid="image-preview"]')).toBeVisible();
    });

    test('should show upload progress', async ({ page }) => {
      await page.goto('/effects/apply/1');

      // Mock slow upload with progress
      await page.route('/api/upload/image', route => {
        // Simulate progressive upload
        setTimeout(() => {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              success: true,
              fileUrl: '/api/mock/uploaded-image.jpg'
            }),
          });
        }, 2000);
      });

      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles(path.join(__dirname, 'fixtures', 'test-image.jpg'));

      // Should show progress bar
      await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
      
      // Progress should complete
      await expect(page.locator('[data-testid="upload-progress"]')).toHaveAttribute('value', '100');
    });
  });

  test.describe('Effect Configuration', () => {
    test('should configure effect parameters', async ({ page }) => {
      await page.goto('/effects/apply/1'); // Upscale effect

      // Upload test image first
      await testHelpers.uploadFile(page, 'input[type="file"]', path.join(__dirname, 'fixtures', 'test-image.jpg'));

      // Configure parameters
      await page.selectOption('[data-testid="upscale-factor"]', '2');
      await page.fill('[data-testid="strength-slider"]', '0.8');

      // Parameters should be reflected in preview
      await expect(page.locator('.parameter-preview')).toContainText('2x');
      await expect(page.locator('.strength-value')).toContainText('0.8');
    });

    test('should validate parameter ranges', async ({ page }) => {
      await page.goto('/effects/apply/1');
      
      await testHelpers.uploadFile(page, 'input[type="file"]', path.join(__dirname, 'fixtures', 'test-image.jpg'));

      // Try invalid parameter values
      const strengthSlider = page.locator('[data-testid="strength-slider"]');
      
      // Set value outside valid range
      await strengthSlider.fill('2.0'); // Max should be 1.0
      
      // Should show validation error
      await expect(page.locator('.parameter-error')).toContainText(/值必须在.*范围内|value must be between/i);
    });

    test('should save parameter presets', async ({ page }) => {
      await page.goto('/effects/apply/1');
      
      await testHelpers.uploadFile(page, 'input[type="file"]', path.join(__dirname, 'fixtures', 'test-image.jpg'));

      // Configure parameters
      await page.selectOption('[data-testid="upscale-factor"]', '4');
      await page.fill('[data-testid="strength-slider"]', '0.9');

      // Save as preset
      await page.click('[data-testid="save-preset-btn"]');
      await page.fill('[data-testid="preset-name"]', 'High Quality Upscale');
      await page.click('[data-testid="confirm-save-preset"]');

      // Preset should appear in dropdown
      await expect(page.locator('[data-testid="preset-dropdown"]')).toContainText('High Quality Upscale');
    });

    test('should load parameter presets', async ({ page }) => {
      await page.goto('/effects/apply/1');
      
      await testHelpers.uploadFile(page, 'input[type="file"]', path.join(__dirname, 'fixtures', 'test-image.jpg'));

      // Select existing preset
      await page.selectOption('[data-testid="preset-dropdown"]', 'High Quality Upscale');

      // Parameters should be loaded
      await expect(page.locator('[data-testid="upscale-factor"]')).toHaveValue('4');
      await expect(page.locator('[data-testid="strength-slider"]')).toHaveValue('0.9');
    });
  });

  test.describe('Task Processing', () => {
    test('should submit effect processing task', async ({ page }) => {
      await page.goto('/effects/apply/1');
      
      // Upload image and configure
      await testHelpers.uploadFile(page, 'input[type="file"]', path.join(__dirname, 'fixtures', 'test-image.jpg'));
      await page.selectOption('[data-testid="upscale-factor"]', '2');

      // Mock task submission
      await page.route('/api/effects/webapp/apply', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            taskId: 'test-task-123',
            status: 'PENDING'
          }),
        });
      });

      // Submit task
      await page.click('[data-testid="apply-effect-btn"]');

      // Should redirect to task status page
      await page.waitForURL('/tasks/test-task-123');
      
      // Should show processing status
      await expect(page.locator('[data-testid="task-status"]')).toContainText('处理中');
      await expect(page.locator('[data-testid="progress-indicator"]')).toBeVisible();
    });

    test('should monitor task progress', async ({ page }) => {
      // Mock task progression: PENDING -> RUNNING -> SUCCESS
      let statusCallCount = 0;
      await page.route('/api/tasks/*/status', route => {
        statusCallCount++;
        let status = 'PENDING';
        if (statusCallCount === 2) status = 'RUNNING';
        if (statusCallCount >= 3) status = 'SUCCESS';

        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            status: status,
            progress: statusCallCount * 33 // 33%, 66%, 99%
          }),
        });
      });

      await page.goto('/tasks/test-task-123');

      // Should show initial pending status
      await expect(page.locator('[data-testid="task-status"]')).toContainText('等待处理');

      // Should update to running
      await expect(page.locator('[data-testid="task-status"]')).toContainText('处理中');
      
      // Should show progress
      await expect(page.locator('[data-testid="progress-bar"]')).toHaveAttribute('value', /.+/);

      // Should complete successfully
      await expect(page.locator('[data-testid="task-status"]')).toContainText('完成');
    });

    test('should handle task failure', async ({ page }) => {
      await page.route('/api/tasks/*/status', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            status: 'FAILED',
            error: 'Processing failed: Invalid image format'
          }),
        });
      });

      await page.goto('/tasks/test-task-123');

      // Should show failure status
      await expect(page.locator('[data-testid="task-status"]')).toContainText('失败');
      await expect(page.locator('.error-message')).toContainText('Invalid image format');

      // Should show retry option
      await expect(page.locator('[data-testid="retry-btn"]')).toBeVisible();
    });

    test('should cancel running task', async ({ page }) => {
      await page.route('/api/tasks/*/status', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            status: 'RUNNING'
          }),
        });
      });

      await page.route('/api/tasks/*/cancel', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      });

      await page.goto('/tasks/test-task-123');

      // Should show cancel button for running task
      await expect(page.locator('[data-testid="cancel-btn"]')).toBeVisible();

      // Click cancel
      await page.click('[data-testid="cancel-btn"]');
      await page.click('[data-testid="confirm-cancel"]'); // Confirm dialog

      // Should show cancelled status
      await expect(page.locator('[data-testid="task-status"]')).toContainText('已取消');
    });

    test('should estimate completion time', async ({ page }) => {
      await page.route('/api/tasks/*/status', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            status: 'RUNNING',
            progress: 45,
            estimatedTimeRemaining: 120 // 2 minutes
          }),
        });
      });

      await page.goto('/tasks/test-task-123');

      // Should show time estimate
      await expect(page.locator('[data-testid="time-remaining"]')).toContainText('约 2 分钟');
    });
  });

  test.describe('Result Gallery', () => {
    test('should display processing results', async ({ page }) => {
      await page.route('/api/tasks/*/results', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            results: [
              '/api/mock/result1.jpg',
              '/api/mock/result2.jpg',
              '/api/mock/result3.jpg'
            ]
          }),
        });
      });

      await page.goto('/tasks/test-task-123/results');

      // Should show image gallery
      await expect(page.locator('[data-testid="result-gallery"]')).toBeVisible();
      
      // Should show all result images
      const resultImages = page.locator('[data-testid="result-image"]');
      await expect(resultImages).toHaveCount(3);

      // Should show first image by default
      const activeImage = page.locator('[data-testid="active-result"]');
      await expect(activeImage).toHaveAttribute('src', '/api/mock/result1.jpg');
    });

    test('should navigate through results', async ({ page }) => {
      await page.route('/api/tasks/*/results', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            results: ['/api/mock/result1.jpg', '/api/mock/result2.jpg']
          }),
        });
      });

      await page.goto('/tasks/test-task-123/results');

      const nextBtn = page.locator('[data-testid="next-result"]');
      const prevBtn = page.locator('[data-testid="prev-result"]');
      const activeImage = page.locator('[data-testid="active-result"]');

      // Navigate to next image
      await nextBtn.click();
      await expect(activeImage).toHaveAttribute('src', '/api/mock/result2.jpg');

      // Navigate back to previous
      await prevBtn.click();
      await expect(activeImage).toHaveAttribute('src', '/api/mock/result1.jpg');
    });

    test('should support keyboard navigation', async ({ page }) => {
      await page.route('/api/tasks/*/results', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            results: ['/api/mock/result1.jpg', '/api/mock/result2.jpg']
          }),
        });
      });

      await page.goto('/tasks/test-task-123/results');

      const gallery = page.locator('[data-testid="result-gallery"]');
      const activeImage = page.locator('[data-testid="active-result"]');

      // Focus gallery and use arrow keys
      await gallery.focus();
      
      await page.keyboard.press('ArrowRight');
      await expect(activeImage).toHaveAttribute('src', '/api/mock/result2.jpg');

      await page.keyboard.press('ArrowLeft');
      await expect(activeImage).toHaveAttribute('src', '/api/mock/result1.jpg');
    });

    test('should open fullscreen view', async ({ page }) => {
      await page.route('/api/tasks/*/results', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            results: ['/api/mock/result1.jpg']
          }),
        });
      });

      await page.goto('/tasks/test-task-123/results');

      // Click image to open fullscreen
      await page.click('[data-testid="active-result"]');

      // Should show fullscreen overlay
      const fullscreen = page.locator('[data-testid="fullscreen-modal"]');
      await expect(fullscreen).toBeVisible();
      
      // Should show fullscreen image
      await expect(fullscreen.locator('img')).toHaveAttribute('src', '/api/mock/result1.jpg');

      // Close with escape key
      await page.keyboard.press('Escape');
      await expect(fullscreen).not.toBeVisible();
    });

    test('should download individual results', async ({ page }) => {
      await page.route('/api/tasks/*/results', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            results: ['/api/mock/result1.jpg']
          }),
        });
      });

      // Mock image download
      await page.route('/api/mock/result1.jpg', route => {
        route.fulfill({
          status: 200,
          contentType: 'image/jpeg',
          body: Buffer.from('mock-image-data'),
        });
      });

      await page.goto('/tasks/test-task-123/results');

      // Set up download event listener
      const downloadPromise = page.waitForEvent('download');

      // Click download button
      await page.click('[data-testid="download-btn"]');

      // Should trigger download
      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/result.*\.jpg$/);
    });

    test('should download all results as zip', async ({ page }) => {
      await page.route('/api/tasks/*/results', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            results: ['/api/mock/result1.jpg', '/api/mock/result2.jpg']
          }),
        });
      });

      await page.route('/api/tasks/*/download-all', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/zip',
          body: Buffer.from('mock-zip-data'),
        });
      });

      await page.goto('/tasks/test-task-123/results');

      const downloadPromise = page.waitForEvent('download');

      // Click download all button
      await page.click('[data-testid="download-all-btn"]');

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/results.*\.zip$/);
    });
  });

  test.describe('Task History', () => {
    test('should display task history', async ({ page }) => {
      await page.route('/api/tasks', route => {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            tasks: [
              {
                id: 'task-1',
                effectName: 'Ultimate upscale',
                status: 'SUCCESS',
                createdAt: '2024-01-15T10:30:00Z',
                thumbnail: '/api/mock/thumb1.jpg'
              },
              {
                id: 'task-2',
                effectName: 'Face Swap',
                status: 'PENDING',
                createdAt: '2024-01-15T11:00:00Z',
                thumbnail: '/api/mock/thumb2.jpg'
              }
            ],
            totalPages: 1,
            currentPage: 1
          }),
        });
      });

      await page.goto('/tasks');

      // Should show task list
      await expect(page.locator('[data-testid="task-list"]')).toBeVisible();
      
      const taskItems = page.locator('[data-testid="task-item"]');
      await expect(taskItems).toHaveCount(2);

      // Should show task details
      await expect(taskItems.first().locator('.task-name')).toContainText('Ultimate upscale');
      await expect(taskItems.first().locator('.task-status')).toContainText('SUCCESS');
    });

    test('should filter tasks by status', async ({ page }) => {
      await page.goto('/tasks');

      // Filter by completed tasks
      await page.selectOption('[data-testid="status-filter"]', 'SUCCESS');

      // Should update task list
      const completedTasks = page.locator('[data-testid="task-item"]:visible');
      await expect(completedTasks).toHaveCount(1);
      await expect(completedTasks.first().locator('.task-status')).toContainText('SUCCESS');
    });

    test('should paginate through task history', async ({ page }) => {
      await page.goto('/tasks');

      // Should show pagination if there are multiple pages
      if (await page.locator('[data-testid="pagination"]').count() > 0) {
        await page.click('[data-testid="next-page"]');
        
        // URL should update with page parameter
        await expect(page).toHaveURL(/page=2/);
        
        // Should load new page of tasks
        await expect(page.locator('[data-testid="task-list"]')).toBeVisible();
      }
    });

    test('should delete completed tasks', async ({ page }) => {
      await page.goto('/tasks');

      // Select task to delete
      await page.check('[data-testid="task-checkbox"]');
      
      // Click delete button
      await page.click('[data-testid="delete-selected"]');
      
      // Confirm deletion
      await page.click('[data-testid="confirm-delete"]');

      // Task should be removed from list
      const taskItems = page.locator('[data-testid="task-item"]');
      await expect(taskItems).toHaveCount(1);
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async ({ page }) => {
      // Mock API error
      await page.route('/api/effects', route => {
        route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            success: false,
            error: 'Internal server error'
          }),
        });
      });

      await page.goto('/effects');

      // Should show error message
      await expect(page.locator('.error-banner')).toContainText('服务暂时不可用');
      
      // Should show retry option
      await expect(page.locator('[data-testid="retry-btn"]')).toBeVisible();
    });

    test('should handle network connectivity issues', async ({ page }) => {
      // Simulate offline
      await page.context().setOffline(true);

      await page.goto('/effects');

      // Should show offline indicator
      await expect(page.locator('.offline-banner')).toContainText('网络连接已断开');

      // Should queue operations when offline
      await page.click('[data-testid="effect-card"]');
      await expect(page.locator('.queued-message')).toContainText('操作已加入队列');
    });

    test('should handle region switching during processing', async ({ page }) => {
      await page.goto('/effects/apply/1');
      
      // Start processing
      await testHelpers.uploadFile(page, 'input[type="file"]', path.join(__dirname, 'fixtures', 'test-image.jpg'));
      await page.click('[data-testid="apply-effect-btn"]');
      await page.waitForURL('/tasks/*');

      // Switch region during processing
      await page.click('[data-testid="region-selector"]');
      await page.click('[data-testid="china-region"]');

      // Should show warning about ongoing tasks
      await expect(page.locator('.region-switch-warning')).toContainText('切换地区可能影响正在处理的任务');
      
      // Task should continue in original region
      await expect(page.locator('[data-testid="task-status"]')).toContainText('处理中');
    });
  });
});