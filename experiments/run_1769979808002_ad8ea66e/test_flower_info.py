import pytest
from your_module import flower_info

def test_flower_info_valid_input():
    """Test flower_info with valid inputs."""
    result = flower_info("Rose", "Red", 5, True)
    expected = {
        'name': "Rose",
        'color': "Red",
        'petals': 5,
        'is_perennial': True
    }
    assert result == expected

def test_flower_info_empty_name():
    """Test flower_info with an empty name."""
    result = flower_info("", "Blue", 6, False)
    expected = {
        'name': "",
        'color': "Blue",
        'petals': 6,
        'is_perennial': False
    }
    assert result == expected

def test_flower_info_empty_color():
    """Test flower_info with an empty color."""
    result = flower_info("Tulip", "", 4, True)
    expected = {
        'name': "Tulip",
        'color': "",
        'petals': 4,
        'is_perennial': True
    }
    assert result == expected

def test_flower_info_negative_petals():
    """Test flower_info with a negative number of petals."""
    result = flower_info("Daisy", "White", -3, True)
    expected = {
        'name': "Daisy",
        'color': "White",
        'petals': -3,
        'is_perennial': True
    }
    assert result == expected

def test_flower_info_non_integer_petals():
    """Test flower_info with a non-integer type for petals."""
    with pytest.raises(TypeError):
        flower_info("Lily", "Pink", "five", True)

def test_flower_info_non_boolean_is_perennial():
    """Test flower_info with a non-boolean type for is_perennial."""
    with pytest.raises(TypeError):
        flower_info("Sunflower", "Yellow", 10, "yes")

def test_flower_info_large_petals():
    """Test flower_info with an extremely large number of petals."""
    result = flower_info("Orchid", "Purple", 1000000, False)
    expected = {
        'name': "Orchid",
        'color': "Purple",
        'petals': 1000000,
        'is_perennial': False
    }
    assert result == expected

def test_flower_info_long_name():
    """Test flower_info with a very long name."""
    long_name = "A" * 1000
    result = flower_info(long_name, "Green", 7, True)
    expected = {
        'name': long_name,
        'color': "Green",
        'petals': 7,
        'is_perennial': True
    }
    assert result == expected

def test_flower_info_long_color():
    """Test flower_info with a very long color."""
    long_color = "B" * 1000
    result = flower_info("Marigold", long_color, 8, False)
    expected = {
        'name': "Marigold",
        'color': long_color,
        'petals': 8,
        'is_perennial': False
    }
    assert result == expected

def test_flower_info_empty_inputs():
    """Test flower_info with all empty inputs."""
    result = flower_info("", "", 0, False)
    expected = {
        'name': "",
        'color': "",
        'petals': 0,
        'is_perennial': False
    }
    assert result == expected

def test_flower_info_large_input():
    """Test flower_info with maximum valid inputs."""
    result = flower_info("MaxFlower", "MaxColor", 2147483647, True)
    expected = {
        'name': "MaxFlower",
        'color': "MaxColor",
        'petals': 2147483647,
        'is_perennial': True
    }
    assert result == expected