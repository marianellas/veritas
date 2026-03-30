import pytest
from your_module import compare_flowers

def test_compare_flowers_more_petals():
    """Test when flower1 has more petals than flower2."""
    flower1 = {'name': 'Rose', 'petals': 10}
    flower2 = {'name': 'Tulip', 'petals': 5}
    result = compare_flowers(flower1, flower2)
    assert result == "The Rose has more petals than the Tulip."

def test_compare_flowers_less_petals():
    """Test when flower1 has less petals than flower2."""
    flower1 = {'name': 'Daisy', 'petals': 3}
    flower2 = {'name': 'Lily', 'petals': 8}
    result = compare_flowers(flower1, flower2)
    assert result == "The Lily has more petals than the Daisy."

def test_compare_flowers_same_petals():
    """Test when both flowers have the same number of petals."""
    flower1 = {'name': 'Orchid', 'petals': 6}
    flower2 = {'name': 'Sunflower', 'petals': 6}
    result = compare_flowers(flower1, flower2)
    assert result == "The Orchid and Sunflower have the same number of petals."

def test_compare_flowers_missing_petals_key_flower1():
    """Test when flower1 is missing the 'petals' key."""
    flower1 = {'name': 'Rose'}
    flower2 = {'name': 'Tulip', 'petals': 5}
    with pytest.raises(KeyError):
        compare_flowers(flower1, flower2)

def test_compare_flowers_missing_petals_key_flower2():
    """Test when flower2 is missing the 'petals' key."""
    flower1 = {'name': 'Rose', 'petals': 10}
    flower2 = {'name': 'Tulip'}
    with pytest.raises(KeyError):
        compare_flowers(flower1, flower2)

def test_compare_flowers_missing_name_key_flower1():
    """Test when flower1 is missing the 'name' key."""
    flower1 = {'petals': 10}
    flower2 = {'name': 'Tulip', 'petals': 5}
    with pytest.raises(KeyError):
        compare_flowers(flower1, flower2)

def test_compare_flowers_missing_name_key_flower2():
    """Test when flower2 is missing the 'name' key."""
    flower1 = {'name': 'Rose', 'petals': 10}
    flower2 = {'petals': 5}
    with pytest.raises(KeyError):
        compare_flowers(flower1, flower2)

def test_compare_flowers_non_integer_petals_flower1():
    """Test when flower1 has a non-integer value for petals."""
    flower1 = {'name': 'Rose', 'petals': 'many'}
    flower2 = {'name': 'Tulip', 'petals': 5}
    with pytest.raises(TypeError):
        compare_flowers(flower1, flower2)

def test_compare_flowers_non_integer_petals_flower2():
    """Test when flower2 has a non-integer value for petals."""
    flower1 = {'name': 'Rose', 'petals': 10}
    flower2 = {'name': 'Tulip', 'petals': 'few'}
    with pytest.raises(TypeError):
        compare_flowers(flower1, flower2)

def test_compare_flowers_zero_petals():
    """Test when both flowers have zero petals."""
    flower1 = {'name': 'Rose', 'petals': 0}
    flower2 = {'name': 'Tulip', 'petals': 0}
    result = compare_flowers(flower1, flower2)
    assert result == "The Rose and Tulip have the same number of petals."

def test_compare_flowers_negative_petals():
    """Test when one flower has negative petals."""
    flower1 = {'name': 'Rose', 'petals': -1}
    flower2 = {'name': 'Tulip', 'petals': 5}
    result = compare_flowers(flower1, flower2)
    assert result == "The Tulip has more petals than the Rose."

def test_compare_flowers_large_petals():
    """Test when both flowers have a very large number of petals."""
    flower1 = {'name': 'Rose', 'petals': 10**6}
    flower2 = {'name': 'Tulip', 'petals': 10**5}
    result = compare_flowers(flower1, flower2)
    assert result == "The Rose has more petals than the Tulip."

def test_compare_flowers_same_flower():
    """Test when both flowers are the same."""
    flower = {'name': 'Rose', 'petals': 10}
    result = compare_flowers(flower, flower)
    assert result == "The Rose and Rose have the same number of petals."