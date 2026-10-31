import hashlib
import http.client
import json
import pathlib
import subprocess
import sys
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from unittest.mock import Mock, patch
from urllib.error import HTTPError

import app
import github_file_cache as cache


class GithubFileCacheTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = pathlib.Path(self.temp.name)
        self.url = 'https://raw.githubusercontent.com/test/repo/' + 'a' * 40 + '/firmware.bin'
        self.fetch = Mock(return_value=(b'firmware', {'Content-Length': '8', 'ETag': 'test-etag'}))

    def get(self, url=None):
        return cache.download(url or self.url, self.root, self.fetch)

    def test_pinned_file_survives_restart_without_network(self):
        self.assertEqual(self.get(), b'firmware')
        self.assertEqual(self.get(), b'firmware')
        self.fetch.assert_called_once()
        script = ('from pathlib import Path; import github_file_cache as c; import sys; '
                  'def_unused=None; '
                  'assert c.download(sys.argv[1],Path(sys.argv[2]),'
                  'lambda headers: (_ for _ in ()).throw(AssertionError("network"))) == b"firmware"')
        subprocess.run([sys.executable, '-c', script, self.url, str(self.root)], check=True)

    def test_parallel_requests_download_once(self):
        with ThreadPoolExecutor(max_workers=8) as pool:
            self.assertEqual(list(pool.map(lambda _: self.get(), range(16))), [b'firmware'] * 16)
        self.fetch.assert_called_once()

    def test_new_commit_and_other_file_download_separately(self):
        self.get()
        self.get(self.url.replace('a' * 40, 'b' * 40))
        self.get(self.url.replace('firmware.bin', 'serviceapp.bin'))
        self.assertEqual(self.fetch.call_count, 3)

    def test_corrupt_content_or_metadata_is_downloaded_again(self):
        self.get()
        next(self.root.glob('*.bin')).write_bytes(b'broken!!')
        self.get()
        next(self.root.glob('*.json')).write_text('broken', encoding='utf-8')
        self.get()
        self.assertEqual(self.fetch.call_count, 3)

    def test_incomplete_download_and_http_errors_are_not_cached(self):
        self.fetch.return_value = (b'partial', {'Content-Length': '999'})
        with self.assertRaises(http.client.IncompleteRead): self.get()
        self.assertEqual(list(self.root.iterdir()), [])
        self.fetch.side_effect = HTTPError(self.url, 429, 'limit', {}, None)
        with self.assertRaises(HTTPError): self.get()
        self.assertEqual(list(self.root.iterdir()), [])

    def test_branch_ttl_and_conditional_revalidation(self):
        url = self.url.replace('a' * 40, 'development')
        with patch.object(cache.time, 'time', return_value=100): self.get(url)
        with patch.object(cache.time, 'time', return_value=101): self.get(url)
        self.fetch.assert_called_once()
        self.fetch.side_effect = HTTPError(url, 304, 'Not Modified', {}, None)
        with patch.object(cache.time, 'time', return_value=100 + cache.BRANCH_TTL):
            self.assertEqual(self.get(url), b'firmware')
        self.assertEqual(self.fetch.call_args.args[0], {'If-None-Match': 'test-etag'})
        with patch.object(cache.time, 'time', return_value=101 + cache.BRANCH_TTL): self.get(url)
        self.assertEqual(self.fetch.call_count, 2)

    def test_changed_branch_and_expired_error_do_not_use_stale_content(self):
        url = self.url.replace('a' * 40, 'development')
        with patch.object(cache.time, 'time', return_value=100): self.get(url)
        self.fetch.return_value = (b'new', {'ETag': 'new-etag'})
        with patch.object(cache.time, 'time', return_value=100 + cache.BRANCH_TTL):
            self.assertEqual(self.get(url), b'new')
        self.fetch.side_effect = HTTPError(url, 503, 'Unavailable', {}, None)
        with patch.object(cache.time, 'time', return_value=100 + 2 * cache.BRANCH_TTL):
            with self.assertRaises(HTTPError): self.get(url)

    def test_device_and_non_public_urls_never_cached(self):
        for url in ('http://device/download?file=/config.txt',
                    'https://raw.githubusercontent.com.evil/test/repo/main/file',
                    self.url + '?token=test', self.url.replace('https:', 'http:')):
            self.get(url); self.get(url)
        self.assertEqual(self.fetch.call_count, 8)
        self.assertEqual(list(self.root.iterdir()), [])

    def test_app_download_bytes_uses_persistent_cache(self):
        response = Mock()
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=False)
        response.read.return_value = b'firmware'
        response.headers = {'Content-Length': '8'}
        with patch.object(app, 'CACHE_DIR', self.root), patch.object(app.request, 'urlopen', return_value=response) as network:
            self.assertEqual(app.download_bytes(self.url), b'firmware')
            self.assertEqual(app.download_bytes(self.url), b'firmware')
            network.assert_called_once()

    def test_service_tool_update_reuses_only_matching_checksum(self):
        payload = b'test-archive'
        status = {'url': 'https://github.com/test/repo/releases/download/v1/test.zip',
                  'available': True, 'version': '99.0.0', 'filename': 'test.zip',
                  'platform': 'windows', 'sha256': hashlib.sha256(payload).hexdigest()}
        target = self.root / '99-0-0' / 'test.zip'
        target.parent.mkdir(); target.write_bytes(payload)
        def download(url, destination, **kwargs): destination.write_bytes(payload)
        with patch.object(app, 'UPDATE_DIR', self.root), patch.object(app, 'service_tool_update_status', return_value=status), \
                patch.object(app, 'download_to_file', side_effect=download) as network:
            app.download_service_tool_update(open_target=False)
            network.assert_not_called()
            target.write_bytes(b'broken')
            app.download_service_tool_update(open_target=False)
            network.assert_called_once()


if __name__ == '__main__':
    unittest.main()
