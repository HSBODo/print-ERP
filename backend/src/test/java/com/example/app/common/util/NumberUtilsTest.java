package com.example.app.common.util;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class NumberUtilsTest {

    @Test
    void toIntHandlesNullNumbersAndStrings() {
        assertThat(NumberUtils.toInt(null)).isZero();
        assertThat(NumberUtils.toInt(12L)).isEqualTo(12);
        assertThat(NumberUtils.toInt("34")).isEqualTo(34);
    }

    @Test
    void roundToOneDecimalRoundsHalfUpAtSingleDecimalPrecision() {
        assertThat(NumberUtils.roundToOneDecimal(33.34)).isEqualTo(33.3);
        assertThat(NumberUtils.roundToOneDecimal(33.35)).isEqualTo(33.4);
    }
}
