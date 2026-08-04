import pytest

@pytest.fixture(scope='session')
def global_test_context():
    return {'env': 'test'}
