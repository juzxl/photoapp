package com.example.photoapp;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.EnableAspectJAutoProxy;

@SpringBootApplication
@EnableAspectJAutoProxy
public class PhotoAppApplication {

	public static void main(String[] args) {
		SpringApplication.run(PhotoAppApplication.class, args);
	}

}
